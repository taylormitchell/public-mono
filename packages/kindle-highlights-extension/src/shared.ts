export async function renderBadge() {
  const amazonAccessible = await readAmazonAccessible();
  const haveToken = await chrome.storage.local.get("token");
  if (!amazonAccessible || !haveToken) {
    chrome.action.setBadgeText({ text: "!" });
    chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
  } else {
    chrome.action.setBadgeText({ text: "" });
    chrome.action.setBadgeBackgroundColor({ color: "#00FF00" });
  }
}

export function readAmazonAccessible() {
  return new Promise<boolean>((resolve) => {
    fetch("https://read.amazon.com/notebook")
      .then((response) => {
        resolve(response.ok);
      })
      .catch(() => {
        resolve(false);
      });
  });
}

export const syncInterval = 24 * 60;

export type Book = {
  asin: string;
  title: string;
  author: string;
  annotations: Annotation[];
};

export type Annotation = {
  id: string;
  highlight: string;
  note: string;
};
