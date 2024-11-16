import React, { useState } from "react";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";

interface HeadingNode {
  level: number;
  text: string;
  content: any;
}

function buildHeadingTree(ast) {
  const stack = [];
  const root = { children: [] };

  function addNode(node, level) {
    const parent = stack.findLast((item) => item.level < level) || root;
    parent.children.push({ ...node, children: [] });
    stack.push({ ...node, level });
  }

  function traverse(node) {
    if (node.type === "heading") {
      addNode(node, node.depth);
    } else if (node.children) {
      node.children.forEach(traverse);
    }
  }

  ast.children.forEach(traverse);
  return root;
}

function getContentUnderHeading(node, path) {
  if (path.length === 0) {
    return node;
  }

  const [index, ...rest] = path;
  const child = node.children[index];

  if (child) {
    return getContentUnderHeading(child, rest);
  } else {
    return null;
  }
}

const MarkdownReader: React.FC = () => {
  const [zoomPath, setZoomPath] = useState<number[]>([]);

  const markdownContent = `
      # Heading 1
      Content under heading 1.
      ## Heading 1.1
      Content under heading 1.1.
      ### Heading 1.1.1
      Content under heading 1.1.1.
      ## Heading 1.2
      Content under heading 1.2.
      # Heading 2
      Content under heading 2.
    `;

  const markdownAST = unified().use(remarkParse).parse(markdownContent);
  const headingTree = buildHeadingTree(markdownAST);
  const contentNode = getContentUnderHeading(headingTree, "");

  return (
    <div className="p-4">
      {/* Breadcrumbs */}
      <div className="content">
        {unified().use(remarkParse).use(remarkRehype).stringify(contentNode)}
      </div>
    </div>
  );
};

export default MarkdownReader;
