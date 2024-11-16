import { useState, useEffect, createContext, useContext, useRef } from "react";
import { init, Node, Relation } from "./db/client";
import { generateNodeId, generateRelationId } from "./db/utils";
import { generateKeyBetween } from "fractional-indexing";

const db = init();

const TreeContext = createContext<{
  addChildBelow: (treeNode: DescendantTreeNode) => void;
  deleteTreeNode: (treeNode: DescendantTreeNode) => void;
  handleIndent: (treeNode: DescendantTreeNode) => void;
  handleDedent: (treeNode: DescendantTreeNode) => void;
  focusedTreeNodeId: string | null;
  setFocusedTreeNodeId: (id: string | null) => void;
} | null>(null);

const App = () => {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [newNodeText, setNewNodeText] = useState("");
  const [newRelationSource, setNewRelationSource] = useState("");
  const [newRelationTarget, setNewRelationTarget] = useState("");

  useEffect(() => {
    (window as any).db = db;
  });

  useEffect(() => {
    return db.subscribe(async (tx) => {
      console.debug("refetching all objects subscription");
      setNodes(await tx.nodes.getAll());
      setRelations(await tx.relations.getAll());
    });
  }, []);

  const addNode = () => {
    if (newNodeText) {
      db.mutate((tx) => tx.nodes.create({ id: generateNodeId(), text: newNodeText }));
      setNewNodeText("");
    }
  };

  const addRelation = () => {
    if (newRelationSource && newRelationTarget) {
      db.mutate((tx) =>
        tx.relations.create({
          id: generateRelationId(),
          sourceId: newRelationSource,
          targetId: newRelationTarget,
          position: generateKeyBetween(null, null),
        })
      );
    }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", margin: "20px" }}>
      <Tree />

      <div>
        <h2>Nodes</h2>
        <input
          value={newNodeText}
          onChange={(e) => setNewNodeText(e.target.value)}
          placeholder="Enter node text"
        />
        <button onClick={addNode}>Add Node</button>
        <ul>
          {nodes.map((node) => (
            <li key={node.id} style={{ display: "flex" }}>
              <div>
                <div>{node.text}</div>
                <div>
                  <small
                    style={{ cursor: "pointer" }}
                    onClick={() => navigator.clipboard.writeText(node.id)}
                  >
                    {node.id}
                  </small>
                </div>
              </div>
              <button
                onClick={() =>
                  db.mutate(async (tx) => {
                    tx.nodes.delete(node.id);
                    const relations = await tx.relations.getAll();
                    relations.forEach((relation) => {
                      if (relation.sourceId === node.id || relation.targetId === node.id) {
                        tx.relations.delete(relation.id);
                      }
                    });
                  })
                }
              >
                x
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2>Relations</h2>
        <input
          value={newRelationSource}
          onChange={(e) => setNewRelationSource(e.target.value)}
          placeholder="Source ID"
        />
        <input
          value={newRelationTarget}
          onChange={(e) => setNewRelationTarget(e.target.value)}
          placeholder="Target ID"
        />
        <button onClick={addRelation}>Add Relation</button>
        <ul>
          {relations.map((relation) => (
            <li key={relation.id}>
              {relation.sourceId} → {relation.targetId}
              <button onClick={() => db.mutate((tx) => tx.relations.delete(relation.id))}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

type RootTreeNode = {
  type: "root";
  id: "root";
  node: Node;
  children: DescendantTreeNode[];
};

type DescendantTreeNode = {
  type: "descendant";
  id: string;
  node: Node;
  children: DescendantTreeNode[];
  parent: TreeNode;
  relationToParent: Relation;
};

type TreeNode = RootTreeNode | DescendantTreeNode;

function Tree() {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [focusedTreeNodeId, setFocusedTreeNodeId] = useState<string | null>(null);

  // Construct tree from graph
  useEffect(() => {
    return db.subscribe(async (tx) => {
      console.debug("rebuilding tree");
      const rootId = (await tx.trees.get("default"))?.rootId;
      if (!rootId) {
        setTree(null);
        return;
      }
      const relations = await tx.relations.getAll();
      const nodesById = new Map<string, Node>();
      // The structure of the tree only changes when the relations change. We subscribe to the
      // node content within the node components themselves. We only pull them here cause it's
      // faster than pulling them one at a time in each component. That's why we flag this as
      // not a dependency.
      (await tx.nodes.getAll({ dep: false })).forEach((node) => nodesById.set(node.id, node));

      function buildTree(
        nodeId: string,
        parent?: { treeNode: TreeNode; relationToChild: Relation }
      ): TreeNode | null {
        const node = nodesById.get(nodeId);
        if (!node) return null;

        const treeNode: TreeNode = parent
          ? {
              id: parent.treeNode.id + "/" + parent.relationToChild?.id,
              type: "descendant",
              node,
              children: [],
              parent: parent?.treeNode,
              relationToParent: parent?.relationToChild,
            }
          : {
              id: "root",
              type: "root",
              node,
              children: [],
            };

        relations.forEach((relation) => {
          if (relation.sourceId === nodeId) {
            const child = buildTree(relation.targetId, { treeNode, relationToChild: relation });
            if (child?.type === "descendant") {
              treeNode.children.push(child);
            }
          }
        });
        treeNode.children.sort((a, b) => {
          return a.relationToParent.position > b.relationToParent.position ? 1 : -1;
        });
        return treeNode;
      }

      setTree(buildTree(rootId));
    });
  }, []);

  const addChildBelow = (treeNode: DescendantTreeNode) => {
    if (!treeNode.parent || !treeNode.relationToParent) return;
    const siblingIndex = treeNode.parent.children.findIndex((child) => child === treeNode);
    const siblingBelow = treeNode.parent.children[siblingIndex + 1];

    const node = { id: generateNodeId(), text: "" };
    const relation = {
      id: generateRelationId(),
      sourceId: treeNode.parent.node.id,
      targetId: node.id,
      position: generateKeyBetween(
        treeNode.relationToParent?.position || null,
        siblingBelow?.relationToParent?.position || null
      ),
    };
    db.mutate((tx) => {
      tx.nodes.create(node);
      tx.relations.create(relation);
    });
    const newTreeNodeId = treeNode.parent.id + "/" + relation.id;
    setFocusedTreeNodeId(newTreeNodeId);
  };

  const deleteTreeNode = (treeNode: DescendantTreeNode) => {
    db.mutate((tx) => {
      tx.nodes.delete(treeNode.node.id);
      tx.relations.delete(treeNode.relationToParent.id);
    });

    // Find the sibling above the deleted node
    if (treeNode.parent) {
      const siblingIndex = treeNode.parent.children.findIndex((child) => child === treeNode);
      const siblingAbove = treeNode.parent.children[siblingIndex - 1];

      if (siblingAbove) {
        setFocusedTreeNodeId(siblingAbove.id);
      }
    }
  };

  const handleIndent = (treeNode: DescendantTreeNode) => {
    db.mutate((tx) => {
      const siblingIndex = treeNode.parent.children.findIndex((child) => child === treeNode);
      const siblingAbove = treeNode.parent.children[siblingIndex - 1];
      if (siblingAbove) {
        tx.relations.update({
          ...treeNode.relationToParent,
          sourceId: siblingAbove.node.id,
          position: generateKeyBetween(
            siblingAbove.children[siblingAbove.children.length - 1]?.relationToParent.position ||
              null,
            null
          ),
        });
      }
      // Set focus after indenting
      setFocusedTreeNodeId(siblingAbove.id + "/" + treeNode.relationToParent.id);
    });
  };

  const handleDedent = (treeNode: DescendantTreeNode) => {
    db.mutate((tx) => {
      if (treeNode.parent.type === "descendant") {
        const grandparent = treeNode.parent.parent;
        const parentIndex = grandparent.children.findIndex((child) => child === treeNode.parent);
        const parentSiblingBelow = grandparent.children[parentIndex + 1];
        tx.relations.update({
          ...treeNode.relationToParent,
          sourceId: grandparent.node.id,
          position: generateKeyBetween(
            treeNode.parent.relationToParent.position,
            parentSiblingBelow?.relationToParent.position ?? null
          ),
        });
        // Set focus after dedenting
        setFocusedTreeNodeId(grandparent.node.id + "/" + treeNode.relationToParent.id);
      }
    });
  };

  const renderTree = (tn: TreeNode) => (
    <li key={tn.node.id}>
      <div
        title={JSON.stringify(
          {
            id: tn.id,
            node: tn.node,
            relationToParent: tn.type === "descendant" ? tn.relationToParent : null,
          },
          null,
          2
        )}
        data-tree-node-id={tn.id}
        style={{ display: "flex" }}
      >
        <Editor id={tn.node.id} initialNode={tn.node} treeNode={tn} />
      </div>
      {tn.children.length > 0 && <ul>{tn.children.map(renderTree)}</ul>}
    </li>
  );

  if (!tree) return null;
  return (
    <div>
      <h2>Tree View</h2>
      <TreeContext.Provider
        value={{
          addChildBelow,
          deleteTreeNode,
          handleIndent,
          handleDedent,
          focusedTreeNodeId,
          setFocusedTreeNodeId,
        }}
      >
        {tree && <ul>{renderTree(tree)}</ul>}
      </TreeContext.Provider>
    </div>
  );
}

function getNextAbove(treeNode: DescendantTreeNode) {
  if (treeNode.type !== "descendant") return null;

  const parent = treeNode.parent;
  const siblingIndex = parent.children.findIndex((child) => child === treeNode);

  if (siblingIndex > 0) {
    // There's a sibling above
    const siblingAbove = parent.children[siblingIndex - 1];

    // If the sibling has no children, return it
    if (siblingAbove.children.length === 0) {
      return siblingAbove;
    }

    // If the sibling has children, return its lowest descendant
    let lowestDescendant = siblingAbove;
    while (lowestDescendant.children.length > 0) {
      lowestDescendant = lowestDescendant.children[lowestDescendant.children.length - 1];
    }
    return lowestDescendant;
  }

  // If there's no sibling above, return the parent
  return parent.type === "descendant" ? parent : null;
}

function getNextBelow(treeNode: DescendantTreeNode) {
  if (treeNode.type !== "descendant") return null;

  // If the current node has children, return the first child
  if (treeNode.children.length > 0) {
    return treeNode.children[0];
  }

  // If no children, look for the next sibling or the next sibling of an ancestor
  let currentNode: TreeNode = treeNode;
  while (currentNode.type === "descendant") {
    const parent = currentNode.parent;
    const siblingIndex = parent.children.findIndex((child) => child === currentNode);

    if (siblingIndex < parent.children.length - 1) {
      // There's a next sibling
      return parent.children[siblingIndex + 1];
    }

    // No next sibling, move up to the parent
    currentNode = parent;
  }

  // If we've reached here, there's no node below
  return null;
}

function Editor({
  id,
  initialNode,
  treeNode,
}: {
  id: string;
  initialNode: Node;
  treeNode: TreeNode;
}) {
  const [node, setNode] = useState<Node | null>(initialNode);
  const treeContext = useContext(TreeContext);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (treeContext && treeContext.focusedTreeNodeId === treeNode.id && inputRef.current) {
      inputRef.current.focus();
    }
  }, [treeContext?.focusedTreeNodeId, treeNode.id]);

  useEffect(() => {
    let firstRun = true;
    return db.subscribe(async (tx) => {
      const updatedNode = await tx.nodes.get(id);
      if (firstRun) {
        firstRun = false;
        return;
      }
      setNode(updatedNode || initialNode);
    });
  }, [id, initialNode]);

  if (!node) return <div>Missing node</div>;
  return (
    <div>
      <input
        ref={inputRef}
        type="text"
        value={node.text}
        onChange={(e) => {
          const text = e.target.value;
          db.mutate((tx) => {
            tx.nodes.update({ ...node, text });
          });
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && treeContext && treeNode.type === "descendant") {
            e.preventDefault();
            treeContext.addChildBelow(treeNode);
          } else if (
            e.key === "Backspace" &&
            node.text === "" &&
            treeContext &&
            treeNode.type === "descendant"
          ) {
            e.preventDefault();
            treeContext.deleteTreeNode(treeNode);
          } else if (e.key === "Tab" && treeContext && treeNode.type === "descendant") {
            e.preventDefault();
            if (e.shiftKey) {
              treeContext.handleDedent(treeNode);
            } else {
              treeContext.handleIndent(treeNode);
            }
          } else if (e.key === "ArrowUp" && treeNode.type === "descendant") {
            e.preventDefault();
            const nextAbove = getNextAbove(treeNode);
            if (nextAbove && treeContext) {
              treeContext.setFocusedTreeNodeId(nextAbove.id);
            }
          } else if (e.key === "ArrowDown" && treeNode.type === "descendant") {
            e.preventDefault();
            const nextBelow = getNextBelow(treeNode);
            if (nextBelow && treeContext) {
              treeContext.setFocusedTreeNodeId(nextBelow.id);
            }
          }
        }}
      />
    </div>
  );
}

export default App;
