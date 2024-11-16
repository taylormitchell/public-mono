import type { Annotation, Book } from "./shared";

chrome.runtime.onMessage.addListener((message) => {
  console.debug("received message", message);
  if (!message.messageId) {
    console.warn("message has no messageId", message);
    return;
  }

  if (message.type === "get-annotations") {
    console.debug("get-annotations", message);
    const { html } = message.data;
    const document = new DOMParser().parseFromString(html, "text/html");

    const annotations: Annotation[] = [];
    const annotationElements =
      document.querySelectorAll("#kp-notebook-annotations > div[id^=Q]") ?? [];
    console.debug("annotationElements", annotationElements);
    for (const el of Array.from(annotationElements)) {
      // Find highlight text
      let highlight = "";
      try {
        const highlightSpan = el.querySelector("#highlight");
        highlight = highlightSpan?.textContent?.trim() ?? "";
      } catch (e) {
        console.error(e);
      }

      // Find note text
      let note = "";
      try {
        const noteSpan = el.querySelector("#note");
        note = noteSpan?.textContent?.trim() ?? "";
      } catch (e) {
        console.error(e);
      }

      if (el.id && (highlight || note)) {
        annotations.push({ id: el.id, highlight, note });
      } else {
        console.warn("missing id, highlight, or note", el);
      }
    }

    console.debug("annotations", annotations);
    chrome.runtime.sendMessage({
      messageId: message.messageId,
      data: annotations,
    });
  } else if (message.type === "get-books") {
    const { html } = message.data;
    const document = new DOMParser().parseFromString(html, "text/html");
    const bookElements = document.querySelectorAll(".kp-notebook-library-each-book");
    const books: Book[] = Array.from(bookElements).map((element) => {
      const asin = element.id;
      const title = element.querySelector("h2")?.textContent?.trim() ?? "";
      const authorElement = Array.from(element.querySelectorAll("p")).find((el) =>
        el.textContent?.trim().startsWith("By:")
      );
      const author = authorElement?.textContent?.trim().replace(/^By:\s*/, "") ?? "";
      return { asin, title, author, annotations: [] };
    });
    console.debug("books", books);

    chrome.runtime.sendMessage({
      messageId: message.messageId,
      data: books,
    });
  } else {
    console.warn("unsupported message type", message);
  }
});
