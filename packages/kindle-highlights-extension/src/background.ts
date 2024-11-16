import { PUT_HIGHLIGHTS_API_URL } from "./env";
import { renderBadge, syncInterval } from "./shared";
import type { Annotation, Book } from "./shared";

chrome.runtime.onInstalled.addListener(async () => {
  console.log("Kindle Highlights Extractor extension is running");
  chrome.storage.local.set({ startedAt: new Date().toISOString() });
  chrome.alarms.create("syncHighlights", { periodInMinutes: syncInterval });
  chrome.alarms.create("checkLoginStatus", { periodInMinutes: 60 });
  fetchHighlights();
  renderBadge();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "syncHighlights") {
    fetchHighlights();
  } else if (alarm.name === "checkLoginStatus") {
    renderBadge();
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "manualSync") {
    fetchHighlights();
  }
});

async function fetchHighlights(): Promise<void> {
  console.log("Fetching annotations");
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ lastSyncTime: new Date().toISOString() });
    // Load auth token
    chrome.storage.local.get("token", async (data) => {
      if (!data.token) {
        return reject(new Error("No token found"));
      }
      // Get list of books
      console.debug("Getting books");
      const booksResponse = await fetch("https://read.amazon.com/notebook", { method: "GET" });
      const html = await booksResponse.text();
      const books = await parseHtml<Book[]>({ type: "get-books", html });
      console.debug("Number of books:", books.length);
      const booksByAsin = new Map<string, Book>();
      books.forEach((book) => {
        booksByAsin.set(book.asin, book);
      });
      const htmlByAsin = new Map<string, string>();

      // Get annotations for each book
      console.debug("Getting all annotations");
      await Promise.all(
        books.map(async (book) => {
          const html = await fetchWithRetry(
            `https://read.amazon.com/notebook?asin=${book.asin}&contentLimitState=&`,
            { method: "GET" }
          );
          htmlByAsin.set(book.asin, html);
          const annotations = await parseHtml<Annotation[]>({ type: "get-annotations", html });
          booksByAsin.set(book.asin, { ...book, annotations });
        })
      );

      // Save annotations
      const bookAnnotations = Array.from(booksByAsin.values())
        .filter((book) => book.annotations.length > 0)
        .sort((a, b) => a.asin.localeCompare(b.asin))
        .flatMap((book) =>
          book.annotations.map((annotation) => ({
            ...annotation,
            asin: book.asin,
            title: book.title,
            author: book.author,
          }))
        );
      console.debug("Saving annotations", { count: bookAnnotations.length });
      const content = JSON.stringify({ highlights: bookAnnotations }, null, 2);
      const putResponse = await fetch(PUT_HIGHLIGHTS_API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${data.token}`,
        },
        body: JSON.stringify({ content }),
      });
      if (putResponse.ok) {
        const data = await putResponse.json();
        console.debug("put response:", data);
        console.log("Annotations saved");
        resolve();
      } else {
        reject(new Error(`Request not ok: ${putResponse.status} ${putResponse.statusText}`));
      }
    });
  });
}

async function parseHtml<T>({
  type,
  html,
  timeout = 10000,
}: {
  type: string;
  html: string;
  timeout?: number;
}): Promise<T> {
  const hasOffscreen = await chrome.offscreen.hasDocument();
  if (!hasOffscreen) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: [chrome.offscreen.Reason.DOM_PARSER],
      justification: "Parse DOM",
    });
  }
  const messageId = Math.random();
  chrome.runtime.sendMessage({ type, messageId, data: { html } });
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      chrome.runtime.onMessage.removeListener(listener);
      reject(new Error(`Timeout after ${timeout}ms`));
    }, timeout);

    const listener = (message: any) => {
      if (message.messageId === messageId) {
        clearTimeout(timeoutId);
        chrome.runtime.onMessage.removeListener(listener);
        resolve(message.data);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  });
}

async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();

      if (text.includes("HTTP Status 500 – Internal Server Error")) {
        throw new Error("Server returned 500 error in response body");
      }

      return text;
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      console.warn(`Attempt ${attempt} failed, retrying...`, error);
      // Wait for 1 second before retrying
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw new Error("Should never reach here");
}
