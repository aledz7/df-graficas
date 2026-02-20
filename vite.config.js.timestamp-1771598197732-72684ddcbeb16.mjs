var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// plugins/visual-editor/vite-plugin-react-inline-editor.js
var vite_plugin_react_inline_editor_exports = {};
__export(vite_plugin_react_inline_editor_exports, {
  default: () => inlineEditPlugin
});
import path from "path";
import { fileURLToPath } from "url";
import { parse } from "file:///var/www/html/df-graficas/node_modules/@babel/parser/lib/index.js";
import traverseBabel from "file:///var/www/html/df-graficas/node_modules/@babel/traverse/lib/index.js";
import generate from "file:///var/www/html/df-graficas/node_modules/@babel/generator/lib/index.js";
import * as t from "file:///var/www/html/df-graficas/node_modules/@babel/types/lib/index.js";
import fs from "fs";
function parseEditId(editId) {
  const parts = editId.split(":");
  if (parts.length < 3) {
    return null;
  }
  const column = parseInt(parts.at(-1), 10);
  const line = parseInt(parts.at(-2), 10);
  const filePath = parts.slice(0, -2).join(":");
  if (!filePath || isNaN(line) || isNaN(column)) {
    return null;
  }
  return { filePath, line, column };
}
function checkTagNameEditable(openingElementNode, editableTagsList) {
  if (!openingElementNode || !openingElementNode.name)
    return false;
  const nameNode = openingElementNode.name;
  if (nameNode.type === "JSXIdentifier" && editableTagsList.includes(nameNode.name)) {
    return true;
  }
  if (nameNode.type === "JSXMemberExpression" && nameNode.property && nameNode.property.type === "JSXIdentifier" && editableTagsList.includes(nameNode.property.name)) {
    return true;
  }
  return false;
}
function inlineEditPlugin() {
  return {
    name: "vite-inline-edit-plugin",
    enforce: "pre",
    transform(code, id) {
      if (!/\.(jsx|tsx)$/.test(id) || !id.startsWith(VITE_PROJECT_ROOT) || id.includes("node_modules")) {
        return null;
      }
      const relativeFilePath = path.relative(VITE_PROJECT_ROOT, id);
      const webRelativeFilePath = relativeFilePath.split(path.sep).join("/");
      try {
        const babelAst = parse(code, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
          errorRecovery: true
        });
        let attributesAdded = 0;
        traverseBabel.default(babelAst, {
          enter(path3) {
            if (path3.isJSXOpeningElement()) {
              const openingNode = path3.node;
              const elementNode = path3.parentPath.node;
              if (!openingNode.loc) {
                return;
              }
              const alreadyHasId = openingNode.attributes.some(
                (attr) => t.isJSXAttribute(attr) && attr.name.name === "data-edit-id"
              );
              if (alreadyHasId) {
                return;
              }
              const isCurrentElementEditable = checkTagNameEditable(openingNode, EDITABLE_HTML_TAGS);
              if (!isCurrentElementEditable) {
                return;
              }
              let shouldBeDisabledDueToChildren = false;
              if (t.isJSXElement(elementNode) && elementNode.children) {
                const hasPropsSpread = openingNode.attributes.some(
                  (attr) => t.isJSXSpreadAttribute(attr) && attr.argument && t.isIdentifier(attr.argument) && attr.argument.name === "props"
                );
                const hasDynamicChild = elementNode.children.some(
                  (child) => t.isJSXExpressionContainer(child)
                );
                if (hasDynamicChild || hasPropsSpread) {
                  shouldBeDisabledDueToChildren = true;
                }
              }
              if (!shouldBeDisabledDueToChildren && t.isJSXElement(elementNode) && elementNode.children) {
                const hasEditableJsxChild = elementNode.children.some((child) => {
                  if (t.isJSXElement(child)) {
                    return checkTagNameEditable(child.openingElement, EDITABLE_HTML_TAGS);
                  }
                  return false;
                });
                if (hasEditableJsxChild) {
                  shouldBeDisabledDueToChildren = true;
                }
              }
              if (shouldBeDisabledDueToChildren) {
                const disabledAttribute = t.jsxAttribute(
                  t.jsxIdentifier("data-edit-disabled"),
                  t.stringLiteral("true")
                );
                openingNode.attributes.push(disabledAttribute);
                attributesAdded++;
                return;
              }
              if (t.isJSXElement(elementNode) && elementNode.children && elementNode.children.length > 0) {
                let hasNonEditableJsxChild = false;
                for (const child of elementNode.children) {
                  if (t.isJSXElement(child)) {
                    if (!checkTagNameEditable(child.openingElement, EDITABLE_HTML_TAGS)) {
                      hasNonEditableJsxChild = true;
                      break;
                    }
                  }
                }
                if (hasNonEditableJsxChild) {
                  const disabledAttribute = t.jsxAttribute(
                    t.jsxIdentifier("data-edit-disabled"),
                    t.stringLiteral("true")
                  );
                  openingNode.attributes.push(disabledAttribute);
                  attributesAdded++;
                  return;
                }
              }
              let currentAncestorCandidatePath = path3.parentPath.parentPath;
              while (currentAncestorCandidatePath) {
                const ancestorJsxElementPath = currentAncestorCandidatePath.isJSXElement() ? currentAncestorCandidatePath : currentAncestorCandidatePath.findParent((p) => p.isJSXElement());
                if (!ancestorJsxElementPath) {
                  break;
                }
                if (checkTagNameEditable(ancestorJsxElementPath.node.openingElement, EDITABLE_HTML_TAGS)) {
                  return;
                }
                currentAncestorCandidatePath = ancestorJsxElementPath.parentPath;
              }
              const line = openingNode.loc.start.line;
              const column = openingNode.loc.start.column + 1;
              const editId = `${webRelativeFilePath}:${line}:${column}`;
              const idAttribute = t.jsxAttribute(
                t.jsxIdentifier("data-edit-id"),
                t.stringLiteral(editId)
              );
              openingNode.attributes.push(idAttribute);
              attributesAdded++;
            }
          }
        });
        if (attributesAdded > 0) {
          const generateFunction = generate.default || generate;
          const output = generateFunction(babelAst, {
            sourceMaps: true,
            sourceFileName: webRelativeFilePath
          }, code);
          return { code: output.code, map: output.map };
        }
        return null;
      } catch (error) {
        console.error(`[vite][visual-editor] Error transforming ${id}:`, error);
        return null;
      }
    },
    // Updates source code based on the changes received from the client
    configureServer(server) {
      server.middlewares.use("/api/apply-edit", async (req, res, next) => {
        if (req.method !== "POST")
          return next();
        let body = "";
        req.on("data", (chunk) => {
          body += chunk.toString();
        });
        req.on("end", async () => {
          var _a;
          let absoluteFilePath = "";
          try {
            const { editId, newFullText } = JSON.parse(body);
            if (!editId || typeof newFullText === "undefined") {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Missing editId or newFullText" }));
            }
            const parsedId = parseEditId(editId);
            if (!parsedId) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Invalid editId format (filePath:line:column)" }));
            }
            const { filePath, line, column } = parsedId;
            absoluteFilePath = path.resolve(VITE_PROJECT_ROOT, filePath);
            if (filePath.includes("..") || !absoluteFilePath.startsWith(VITE_PROJECT_ROOT) || absoluteFilePath.includes("node_modules")) {
              res.writeHead(400, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Invalid path" }));
            }
            const originalContent = fs.readFileSync(absoluteFilePath, "utf-8");
            const babelAst = parse(originalContent, {
              sourceType: "module",
              plugins: ["jsx", "typescript"],
              errorRecovery: true
            });
            let targetNodePath = null;
            const visitor = {
              JSXOpeningElement(path3) {
                const node = path3.node;
                if (node.loc && node.loc.start.line === line && node.loc.start.column + 1 === column) {
                  targetNodePath = path3;
                  path3.stop();
                }
              }
            };
            traverseBabel.default(babelAst, visitor);
            if (!targetNodePath) {
              res.writeHead(404, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Target node not found by line/column", editId }));
            }
            const generateFunction = generate.default || generate;
            const parentElementNode = (_a = targetNodePath.parentPath) == null ? void 0 : _a.node;
            let beforeCode = "";
            if (parentElementNode && t.isJSXElement(parentElementNode)) {
              const beforeOutput = generateFunction(parentElementNode, {});
              beforeCode = beforeOutput.code;
            }
            let modified = false;
            if (parentElementNode && t.isJSXElement(parentElementNode)) {
              parentElementNode.children = [];
              if (newFullText && newFullText.trim() !== "") {
                const newTextNode = t.jsxText(newFullText);
                parentElementNode.children.push(newTextNode);
              }
              modified = true;
            }
            if (!modified) {
              res.writeHead(409, { "Content-Type": "application/json" });
              return res.end(JSON.stringify({ error: "Could not apply changes to AST." }));
            }
            let afterCode = "";
            if (parentElementNode && t.isJSXElement(parentElementNode)) {
              const afterOutput = generateFunction(parentElementNode, {});
              afterCode = afterOutput.code;
            }
            const output = generateFunction(babelAst, {});
            const newContent = output.code;
            try {
              fs.writeFileSync(absoluteFilePath, newContent, "utf-8");
            } catch (writeError) {
              console.error(`[vite][visual-editor] Error during direct write for ${filePath}:`, writeError);
              throw writeError;
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              success: true,
              newFileContent: newContent,
              beforeCode,
              afterCode
            }));
          } catch (error) {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Internal server error during edit application." }));
          }
        });
      });
    }
  };
}
var __vite_injected_original_import_meta_url, __filename, __dirname2, VITE_PROJECT_ROOT, EDITABLE_HTML_TAGS;
var init_vite_plugin_react_inline_editor = __esm({
  "plugins/visual-editor/vite-plugin-react-inline-editor.js"() {
    __vite_injected_original_import_meta_url = "file:///var/www/html/df-graficas/plugins/visual-editor/vite-plugin-react-inline-editor.js";
    __filename = fileURLToPath(__vite_injected_original_import_meta_url);
    __dirname2 = path.dirname(__filename);
    VITE_PROJECT_ROOT = path.resolve(__dirname2, "../..");
    EDITABLE_HTML_TAGS = ["a", "Button", "button", "p", "span", "h1", "h2", "h3", "h4"];
  }
});

// plugins/visual-editor/vite-plugin-edit-mode.js
var vite_plugin_edit_mode_exports = {};
__export(vite_plugin_edit_mode_exports, {
  default: () => inlineEditDevPlugin
});
import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath as fileURLToPath2 } from "url";
function inlineEditDevPlugin() {
  return {
    name: "vite:inline-edit-dev",
    apply: "serve",
    transformIndexHtml() {
      const scriptPath = resolve(__dirname3, "edit-mode-script.js");
      const scriptContent = readFileSync(scriptPath, "utf-8");
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: scriptContent,
          injectTo: "body"
        },
        {
          tag: "style",
          children: EDIT_MODE_STYLES,
          injectTo: "head"
        }
      ];
    }
  };
}
var __vite_injected_original_import_meta_url2, EDIT_MODE_STYLES, __filename2, __dirname3;
var init_vite_plugin_edit_mode = __esm({
  "plugins/visual-editor/vite-plugin-edit-mode.js"() {
    __vite_injected_original_import_meta_url2 = "file:///var/www/html/df-graficas/plugins/visual-editor/vite-plugin-edit-mode.js";
    EDIT_MODE_STYLES = `
  #root[data-edit-mode-enabled="true"] [data-edit-id] {
    cursor: pointer; 
    outline: 1px dashed #357DF9; 
    outline-offset: 2px;
    min-height: 1em;
  }
  #root[data-edit-mode-enabled="true"] {
    cursor: pointer;
  }
  #root[data-edit-mode-enabled="true"] [data-edit-id]:hover {
    background-color: #357DF933;
    outline-color: #357DF9; 
  }

  @keyframes fadeInTooltip {
    from {
      opacity: 0;
      transform: translateY(5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  #inline-editor-disabled-tooltip {
    display: none; 
    opacity: 0; 
    position: absolute;
    background-color: #1D1E20;
    color: white;
    padding: 4px 8px;
    border-radius: 8px;
    z-index: 10001;
    font-size: 14px;
    border: 1px solid #3B3D4A;
    max-width: 184px;
    text-align: center;
  }

  #inline-editor-disabled-tooltip.tooltip-active {
    display: block;
    animation: fadeInTooltip 0.2s ease-out forwards;
  }
`;
    __filename2 = fileURLToPath2(__vite_injected_original_import_meta_url2);
    __dirname3 = resolve(__filename2, "..");
  }
});

// vite.config.js
import path2 from "node:path";
import react from "file:///var/www/html/df-graficas/node_modules/@vitejs/plugin-react/dist/index.js";
import { createLogger, defineConfig } from "file:///var/www/html/df-graficas/node_modules/vite/dist/node/index.js";
var __vite_injected_original_dirname = "/var/www/html/df-graficas";
var isDev = process.env.NODE_ENV !== "production";
var inlineEditPlugin2;
var editModeDevPlugin;
if (isDev) {
  inlineEditPlugin2 = (await Promise.resolve().then(() => (init_vite_plugin_react_inline_editor(), vite_plugin_react_inline_editor_exports))).default;
  editModeDevPlugin = (await Promise.resolve().then(() => (init_vite_plugin_edit_mode(), vite_plugin_edit_mode_exports))).default;
}
var configHorizonsViteErrorHandler = `
const observer = new MutationObserver((mutations) => {
	for (const mutation of mutations) {
		for (const addedNode of mutation.addedNodes) {
			if (
				addedNode.nodeType === Node.ELEMENT_NODE &&
				(
					addedNode.tagName?.toLowerCase() === 'vite-error-overlay' ||
					addedNode.classList?.contains('backdrop')
				)
			) {
				handleViteOverlay(addedNode);
			}
		}
	}
});

observer.observe(document.documentElement, {
	childList: true,
	subtree: true
});

function handleViteOverlay(node) {
	if (!node.shadowRoot) {
		return;
	}

	const backdrop = node.shadowRoot.querySelector('.backdrop');

	if (backdrop) {
		const overlayHtml = backdrop.outerHTML;
		const parser = new DOMParser();
		const doc = parser.parseFromString(overlayHtml, 'text/html');
		const messageBodyElement = doc.querySelector('.message-body');
		const fileElement = doc.querySelector('.file');
		const messageText = messageBodyElement ? messageBodyElement.textContent.trim() : '';
		const fileText = fileElement ? fileElement.textContent.trim() : '';
		const error = messageText + (fileText ? ' File:' + fileText : '');

		window.parent.postMessage({
			type: 'horizons-vite-error',
			error,
		}, '*');
	}
}
`;
var configHorizonsRuntimeErrorHandler = `
window.onerror = (message, source, lineno, colno, errorObj) => {
	const errorDetails = errorObj ? JSON.stringify({
		name: errorObj.name,
		message: errorObj.message,
		stack: errorObj.stack,
		source,
		lineno,
		colno,
	}) : null;

	window.parent.postMessage({
		type: 'horizons-runtime-error',
		message,
		error: errorDetails
	}, '*');
};
`;
var configHorizonsConsoleErrroHandler = `
const originalConsoleError = console.error;
console.error = function(...args) {
	originalConsoleError.apply(console, args);

	let errorString = '';

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg instanceof Error) {
			errorString = arg.stack || \`\${arg.name}: \${arg.message}\`;
			break;
		}
	}

	if (!errorString) {
		errorString = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(' ');
	}

	window.parent.postMessage({
		type: 'horizons-console-error',
		error: errorString
	}, '*');
};
`;
var configWindowFetchMonkeyPatch = `
const originalFetch = window.fetch;

window.fetch = function(...args) {
	const url = args[0] instanceof Request ? args[0].url : args[0];

	// Skip WebSocket URLs
	if (url.startsWith('ws:') || url.startsWith('wss:')) {
		return originalFetch.apply(this, args);
	}

	return originalFetch.apply(this, args)
		.then(async response => {
			const contentType = response.headers.get('Content-Type') || '';

			// Exclude HTML document responses
			const isDocumentResponse =
				contentType.includes('text/html') ||
				contentType.includes('application/xhtml+xml');

			if (!response.ok && !isDocumentResponse) {
					const responseClone = response.clone();
					const errorFromRes = await responseClone.text();
					const requestUrl = response.url;
					console.error(\`Fetch error from \${requestUrl}: \${errorFromRes}\`);
			}

			return response;
		})
		.catch(error => {
			if (!url.match(/.html?$/i)) {
				console.error(error);
			}

			throw error;
		});
};
`;
var addTransformIndexHtml = {
  name: "add-transform-index-html",
  transformIndexHtml(html) {
    return {
      html,
      tags: [
        {
          tag: "script",
          attrs: { type: "module" },
          children: configHorizonsRuntimeErrorHandler,
          injectTo: "head"
        },
        {
          tag: "script",
          attrs: { type: "module" },
          children: configHorizonsViteErrorHandler,
          injectTo: "head"
        },
        {
          tag: "script",
          attrs: { type: "module" },
          children: configHorizonsConsoleErrroHandler,
          injectTo: "head"
        },
        {
          tag: "script",
          attrs: { type: "module" },
          children: configWindowFetchMonkeyPatch,
          injectTo: "head"
        }
      ]
    };
  }
};
console.warn = () => {
};
var logger = createLogger();
var loggerError = logger.error;
logger.error = (msg, options) => {
  var _a;
  if ((_a = options == null ? void 0 : options.error) == null ? void 0 : _a.toString().includes("CssSyntaxError: [postcss]")) {
    return;
  }
  loggerError(msg, options);
};
var vite_config_default = defineConfig({
  customLogger: logger,
  // Carrega as variáveis de ambiente do arquivo .env correspondente
  envDir: ".",
  define: {
    "import.meta.env": JSON.stringify(process.env)
  },
  server: {
    port: 5180,
    strictPort: true,
    open: true,
    host: "localhost",
    cors: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "credentialless"
    },
    allowedHosts: true,
    hmr: {
      port: 5181,
      host: "localhost"
    },
    proxy: {
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:8001",
        changeOrigin: true,
        secure: false,
        ws: true,
        router: {
          // Configuração para aceitar múltiplos domínios
          "https://sistema-graficas.dfinformatica.net": "https://sistema-graficas.dfinformatica.net/backend",
          "https://www.sistema-graficas.dfinformatica.net": "https://www.sistema-graficas.dfinformatica.net/backend"
        }
      }
    }
  },
  plugins: [
    ...isDev ? [inlineEditPlugin2(), editModeDevPlugin()] : [],
    react(),
    addTransformIndexHtml
  ],
  resolve: {
    extensions: [".jsx", ".js", ".tsx", ".ts", ".json"],
    alias: {
      "@": path2.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  build: {
    rollupOptions: {
      external: [
        "@babel/parser",
        "@babel/traverse",
        "@babel/generator",
        "@babel/types"
      ]
    }
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "lucide-react"
    ]
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsicGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanMiLCAicGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLWVkaXQtbW9kZS5qcyIsICJ2aXRlLmNvbmZpZy5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi92YXIvd3d3L2h0bWwvZGYtZ3JhZmljYXMvcGx1Z2lucy92aXN1YWwtZWRpdG9yXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvdmFyL3d3dy9odG1sL2RmLWdyYWZpY2FzL3BsdWdpbnMvdmlzdWFsLWVkaXRvci92aXRlLXBsdWdpbi1yZWFjdC1pbmxpbmUtZWRpdG9yLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy92YXIvd3d3L2h0bWwvZGYtZ3JhZmljYXMvcGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xuaW1wb3J0IHsgcGFyc2UgfSBmcm9tICdAYmFiZWwvcGFyc2VyJztcbmltcG9ydCB0cmF2ZXJzZUJhYmVsIGZyb20gJ0BiYWJlbC90cmF2ZXJzZSc7XG5pbXBvcnQgZ2VuZXJhdGUgZnJvbSAnQGJhYmVsL2dlbmVyYXRvcic7XG5pbXBvcnQgKiBhcyB0IGZyb20gJ0BiYWJlbC90eXBlcyc7XG5pbXBvcnQgZnMgZnJvbSAnZnMnO1xuXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKF9fZmlsZW5hbWUpO1xuY29uc3QgVklURV9QUk9KRUNUX1JPT1QgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4nKTtcbmNvbnN0IEVESVRBQkxFX0hUTUxfVEFHUyA9IFtcImFcIiwgXCJCdXR0b25cIiwgXCJidXR0b25cIiwgXCJwXCIsIFwic3BhblwiLCBcImgxXCIsIFwiaDJcIiwgXCJoM1wiLCBcImg0XCJdO1xuXG5mdW5jdGlvbiBwYXJzZUVkaXRJZChlZGl0SWQpIHtcbiAgY29uc3QgcGFydHMgPSBlZGl0SWQuc3BsaXQoJzonKTtcblxuICBpZiAocGFydHMubGVuZ3RoIDwgMykge1xuICAgIHJldHVybiBudWxsO1xuICB9XG5cbiAgY29uc3QgY29sdW1uID0gcGFyc2VJbnQocGFydHMuYXQoLTEpLCAxMCk7XG4gIGNvbnN0IGxpbmUgPSBwYXJzZUludChwYXJ0cy5hdCgtMiksIDEwKTtcbiAgY29uc3QgZmlsZVBhdGggPSBwYXJ0cy5zbGljZSgwLCAtMikuam9pbignOicpO1xuXG4gIGlmICghZmlsZVBhdGggfHwgaXNOYU4obGluZSkgfHwgaXNOYU4oY29sdW1uKSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIFxuICByZXR1cm4geyBmaWxlUGF0aCwgbGluZSwgY29sdW1uIH07XG59XG5cbmZ1bmN0aW9uIGNoZWNrVGFnTmFtZUVkaXRhYmxlKG9wZW5pbmdFbGVtZW50Tm9kZSwgZWRpdGFibGVUYWdzTGlzdCkge1xuICAgIGlmICghb3BlbmluZ0VsZW1lbnROb2RlIHx8ICFvcGVuaW5nRWxlbWVudE5vZGUubmFtZSkgcmV0dXJuIGZhbHNlO1xuICAgIGNvbnN0IG5hbWVOb2RlID0gb3BlbmluZ0VsZW1lbnROb2RlLm5hbWU7XG5cbiAgICAvLyBDaGVjayAxOiBEaXJlY3QgbmFtZSAoZm9yIDxwPiwgPEJ1dHRvbj4pXG4gICAgaWYgKG5hbWVOb2RlLnR5cGUgPT09ICdKU1hJZGVudGlmaWVyJyAmJiBlZGl0YWJsZVRhZ3NMaXN0LmluY2x1ZGVzKG5hbWVOb2RlLm5hbWUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIC8vIENoZWNrIDI6IFByb3BlcnR5IG5hbWUgb2YgYSBtZW1iZXIgZXhwcmVzc2lvbiAoZm9yIDxtb3Rpb24uaDE+LCBjaGVjayBpZiBcImgxXCIgaXMgaW4gZWRpdGFibGVUYWdzTGlzdClcbiAgICBpZiAobmFtZU5vZGUudHlwZSA9PT0gJ0pTWE1lbWJlckV4cHJlc3Npb24nICYmIG5hbWVOb2RlLnByb3BlcnR5ICYmIG5hbWVOb2RlLnByb3BlcnR5LnR5cGUgPT09ICdKU1hJZGVudGlmaWVyJyAmJiBlZGl0YWJsZVRhZ3NMaXN0LmluY2x1ZGVzKG5hbWVOb2RlLnByb3BlcnR5Lm5hbWUpKSB7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH1cblxuICAgIHJldHVybiBmYWxzZTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5saW5lRWRpdFBsdWdpbigpIHsgIFxuICByZXR1cm4ge1xuICAgIG5hbWU6ICd2aXRlLWlubGluZS1lZGl0LXBsdWdpbicsXG4gICAgZW5mb3JjZTogJ3ByZScsXG5cbiAgICB0cmFuc2Zvcm0oY29kZSwgaWQpIHtcbiAgICAgIGlmICghL1xcLihqc3h8dHN4KSQvLnRlc3QoaWQpIHx8ICFpZC5zdGFydHNXaXRoKFZJVEVfUFJPSkVDVF9ST09UKSB8fCBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzJykpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IHJlbGF0aXZlRmlsZVBhdGggPSBwYXRoLnJlbGF0aXZlKFZJVEVfUFJPSkVDVF9ST09ULCBpZCk7XG4gICAgICBjb25zdCB3ZWJSZWxhdGl2ZUZpbGVQYXRoID0gcmVsYXRpdmVGaWxlUGF0aC5zcGxpdChwYXRoLnNlcCkuam9pbignLycpO1xuXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBiYWJlbEFzdCA9IHBhcnNlKGNvZGUsIHtcbiAgICAgICAgICBzb3VyY2VUeXBlOiAnbW9kdWxlJyxcbiAgICAgICAgICBwbHVnaW5zOiBbJ2pzeCcsICd0eXBlc2NyaXB0J10sXG4gICAgICAgICAgZXJyb3JSZWNvdmVyeTogdHJ1ZVxuICAgICAgICB9KTtcblxuICAgICAgICBsZXQgYXR0cmlidXRlc0FkZGVkID0gMDtcblxuICAgICAgICB0cmF2ZXJzZUJhYmVsLmRlZmF1bHQoYmFiZWxBc3QsIHtcbiAgICAgICAgICBlbnRlcihwYXRoKSB7XG4gICAgICAgICAgICBpZiAocGF0aC5pc0pTWE9wZW5pbmdFbGVtZW50KCkpIHtcbiAgICAgICAgICAgICAgY29uc3Qgb3BlbmluZ05vZGUgPSBwYXRoLm5vZGU7XG4gICAgICAgICAgICAgIGNvbnN0IGVsZW1lbnROb2RlID0gcGF0aC5wYXJlbnRQYXRoLm5vZGU7IC8vIFRoZSBKU1hFbGVtZW50IGl0c2VsZlxuXG4gICAgICAgICAgICAgIGlmICghb3BlbmluZ05vZGUubG9jKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgY29uc3QgYWxyZWFkeUhhc0lkID0gb3BlbmluZ05vZGUuYXR0cmlidXRlcy5zb21lKFxuICAgICAgICAgICAgICAgIChhdHRyKSA9PiB0LmlzSlNYQXR0cmlidXRlKGF0dHIpICYmIGF0dHIubmFtZS5uYW1lID09PSAnZGF0YS1lZGl0LWlkJ1xuICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgIGlmIChhbHJlYWR5SGFzSWQpIHtcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBDb25kaXRpb24gMTogSXMgdGhlIGN1cnJlbnQgZWxlbWVudCB0YWcgdHlwZSBlZGl0YWJsZT9cbiAgICAgICAgICAgICAgY29uc3QgaXNDdXJyZW50RWxlbWVudEVkaXRhYmxlID0gY2hlY2tUYWdOYW1lRWRpdGFibGUob3BlbmluZ05vZGUsIEVESVRBQkxFX0hUTUxfVEFHUyk7XG4gICAgICAgICAgICAgIGlmICghaXNDdXJyZW50RWxlbWVudEVkaXRhYmxlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgbGV0IHNob3VsZEJlRGlzYWJsZWREdWVUb0NoaWxkcmVuID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgLy8gQ29uZGl0aW9uIDI6IERvZXMgdGhlIGVsZW1lbnQgaGF2ZSBkeW5hbWljIG9yIGVkaXRhYmxlIGNoaWxkcmVuXG4gICAgICAgICAgICAgIGlmICh0LmlzSlNYRWxlbWVudChlbGVtZW50Tm9kZSkgJiYgZWxlbWVudE5vZGUuY2hpbGRyZW4pIHtcbiAgICAgICAgICAgICAgICAvLyBDaGVjayBpZiBlbGVtZW50IGhhcyB7Li4ucHJvcHN9IHNwcmVhZCBhdHRyaWJ1dGUgLSBkaXNhYmxlIGVkaXRpbmcgaWYgaXQgZG9lc1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc1Byb3BzU3ByZWFkID0gb3BlbmluZ05vZGUuYXR0cmlidXRlcy5zb21lKGF0dHIgPT4gdC5pc0pTWFNwcmVhZEF0dHJpYnV0ZShhdHRyKSBcbiAgICAgICAgICAgICAgICAmJiBhdHRyLmFyZ3VtZW50ICBcbiAgICAgICAgICAgICAgICAmJiB0LmlzSWRlbnRpZmllcihhdHRyLmFyZ3VtZW50KSBcbiAgICAgICAgICAgICAgICAmJiBhdHRyLmFyZ3VtZW50Lm5hbWUgPT09ICdwcm9wcydcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgaGFzRHluYW1pY0NoaWxkID0gZWxlbWVudE5vZGUuY2hpbGRyZW4uc29tZShjaGlsZCA9PlxuICAgICAgICAgICAgICAgICAgdC5pc0pTWEV4cHJlc3Npb25Db250YWluZXIoY2hpbGQpXG4gICAgICAgICAgICAgICAgKTtcblxuICAgICAgICAgICAgICAgIGlmIChoYXNEeW5hbWljQ2hpbGQgfHwgaGFzUHJvcHNTcHJlYWQpIHtcbiAgICAgICAgICAgICAgICAgIHNob3VsZEJlRGlzYWJsZWREdWVUb0NoaWxkcmVuID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICBpZiAoIXNob3VsZEJlRGlzYWJsZWREdWVUb0NoaWxkcmVuICYmIHQuaXNKU1hFbGVtZW50KGVsZW1lbnROb2RlKSAmJiBlbGVtZW50Tm9kZS5jaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhhc0VkaXRhYmxlSnN4Q2hpbGQgPSBlbGVtZW50Tm9kZS5jaGlsZHJlbi5zb21lKGNoaWxkID0+IHtcbiAgICAgICAgICAgICAgICAgIGlmICh0LmlzSlNYRWxlbWVudChjaGlsZCkpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoZWNrVGFnTmFtZUVkaXRhYmxlKGNoaWxkLm9wZW5pbmdFbGVtZW50LCBFRElUQUJMRV9IVE1MX1RBR1MpO1xuICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoaGFzRWRpdGFibGVKc3hDaGlsZCkge1xuICAgICAgICAgICAgICAgICAgc2hvdWxkQmVEaXNhYmxlZER1ZVRvQ2hpbGRyZW4gPSB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIGlmIChzaG91bGRCZURpc2FibGVkRHVlVG9DaGlsZHJlbikge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRpc2FibGVkQXR0cmlidXRlID0gdC5qc3hBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgICB0LmpzeElkZW50aWZpZXIoJ2RhdGEtZWRpdC1kaXNhYmxlZCcpLFxuICAgICAgICAgICAgICAgICAgdC5zdHJpbmdMaXRlcmFsKCd0cnVlJylcbiAgICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgICAgb3BlbmluZ05vZGUuYXR0cmlidXRlcy5wdXNoKGRpc2FibGVkQXR0cmlidXRlKTtcbiAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzQWRkZWQrKztcbiAgICAgICAgICAgICAgICByZXR1cm47XG4gICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAvLyBDb25kaXRpb24gMzogUGFyZW50IGlzIG5vbi1lZGl0YWJsZSBpZiBBVCBMRUFTVCBPTkUgY2hpbGQgSlNYRWxlbWVudCBpcyBhIG5vbi1lZGl0YWJsZSB0eXBlLlxuICAgICAgICAgICAgICBpZiAodC5pc0pTWEVsZW1lbnQoZWxlbWVudE5vZGUpICYmIGVsZW1lbnROb2RlLmNoaWxkcmVuICYmIGVsZW1lbnROb2RlLmNoaWxkcmVuLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgICAgICAgIGxldCBoYXNOb25FZGl0YWJsZUpzeENoaWxkID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgICBmb3IgKGNvbnN0IGNoaWxkIG9mIGVsZW1lbnROb2RlLmNoaWxkcmVuKSB7XG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHQuaXNKU1hFbGVtZW50KGNoaWxkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWNoZWNrVGFnTmFtZUVkaXRhYmxlKGNoaWxkLm9wZW5pbmdFbGVtZW50LCBFRElUQUJMRV9IVE1MX1RBR1MpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICBoYXNOb25FZGl0YWJsZUpzeENoaWxkID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgaWYgKGhhc05vbkVkaXRhYmxlSnN4Q2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICBjb25zdCBkaXNhYmxlZEF0dHJpYnV0ZSA9IHQuanN4QXR0cmlidXRlKFxuICAgICAgICAgICAgICAgICAgICAgICAgdC5qc3hJZGVudGlmaWVyKCdkYXRhLWVkaXQtZGlzYWJsZWQnKSxcbiAgICAgICAgICAgICAgICAgICAgICAgIHQuc3RyaW5nTGl0ZXJhbChcInRydWVcIilcbiAgICAgICAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgICAgICAgIG9wZW5pbmdOb2RlLmF0dHJpYnV0ZXMucHVzaChkaXNhYmxlZEF0dHJpYnV0ZSk7XG4gICAgICAgICAgICAgICAgICAgICAgYXR0cmlidXRlc0FkZGVkKys7XG4gICAgICAgICAgICAgICAgICAgICAgcmV0dXJuOyBcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgIC8vIENvbmRpdGlvbiA0OiBJcyBhbnkgYW5jZXN0b3IgSlNYRWxlbWVudCBhbHNvIGVkaXRhYmxlP1xuICAgICAgICAgICAgICBsZXQgY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aCA9IHBhdGgucGFyZW50UGF0aC5wYXJlbnRQYXRoO1xuICAgICAgICAgICAgICB3aGlsZSAoY3VycmVudEFuY2VzdG9yQ2FuZGlkYXRlUGF0aCkge1xuICAgICAgICAgICAgICAgICAgY29uc3QgYW5jZXN0b3JKc3hFbGVtZW50UGF0aCA9IGN1cnJlbnRBbmNlc3RvckNhbmRpZGF0ZVBhdGguaXNKU1hFbGVtZW50KClcbiAgICAgICAgICAgICAgICAgICAgICA/IGN1cnJlbnRBbmNlc3RvckNhbmRpZGF0ZVBhdGhcbiAgICAgICAgICAgICAgICAgICAgICA6IGN1cnJlbnRBbmNlc3RvckNhbmRpZGF0ZVBhdGguZmluZFBhcmVudChwID0+IHAuaXNKU1hFbGVtZW50KCkpO1xuXG4gICAgICAgICAgICAgICAgICBpZiAoIWFuY2VzdG9ySnN4RWxlbWVudFBhdGgpIHtcbiAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgaWYgKGNoZWNrVGFnTmFtZUVkaXRhYmxlKGFuY2VzdG9ySnN4RWxlbWVudFBhdGgubm9kZS5vcGVuaW5nRWxlbWVudCwgRURJVEFCTEVfSFRNTF9UQUdTKSkge1xuICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgIGN1cnJlbnRBbmNlc3RvckNhbmRpZGF0ZVBhdGggPSBhbmNlc3RvckpzeEVsZW1lbnRQYXRoLnBhcmVudFBhdGg7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGNvbnN0IGxpbmUgPSBvcGVuaW5nTm9kZS5sb2Muc3RhcnQubGluZTtcbiAgICAgICAgICAgICAgY29uc3QgY29sdW1uID0gb3BlbmluZ05vZGUubG9jLnN0YXJ0LmNvbHVtbiArIDE7XG4gICAgICAgICAgICAgIGNvbnN0IGVkaXRJZCA9IGAke3dlYlJlbGF0aXZlRmlsZVBhdGh9OiR7bGluZX06JHtjb2x1bW59YDtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIGNvbnN0IGlkQXR0cmlidXRlID0gdC5qc3hBdHRyaWJ1dGUoXG4gICAgICAgICAgICAgICAgdC5qc3hJZGVudGlmaWVyKCdkYXRhLWVkaXQtaWQnKSxcbiAgICAgICAgICAgICAgICB0LnN0cmluZ0xpdGVyYWwoZWRpdElkKVxuICAgICAgICAgICAgICApO1xuXG4gICAgICAgICAgICAgIG9wZW5pbmdOb2RlLmF0dHJpYnV0ZXMucHVzaChpZEF0dHJpYnV0ZSk7XG4gICAgICAgICAgICAgIGF0dHJpYnV0ZXNBZGRlZCsrO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKGF0dHJpYnV0ZXNBZGRlZCA+IDApIHtcbiAgICAgICAgICBjb25zdCBnZW5lcmF0ZUZ1bmN0aW9uID0gZ2VuZXJhdGUuZGVmYXVsdCB8fCBnZW5lcmF0ZTtcbiAgICAgICAgICBjb25zdCBvdXRwdXQgPSBnZW5lcmF0ZUZ1bmN0aW9uKGJhYmVsQXN0LCB7XG4gICAgICAgICAgICBzb3VyY2VNYXBzOiB0cnVlLFxuICAgICAgICAgICAgc291cmNlRmlsZU5hbWU6IHdlYlJlbGF0aXZlRmlsZVBhdGhcbiAgICAgICAgICB9LCBjb2RlKTtcblxuICAgICAgICAgIHJldHVybiB7IGNvZGU6IG91dHB1dC5jb2RlLCBtYXA6IG91dHB1dC5tYXAgfTtcbiAgICAgICAgfVxuXG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihgW3ZpdGVdW3Zpc3VhbC1lZGl0b3JdIEVycm9yIHRyYW5zZm9ybWluZyAke2lkfTpgLCBlcnJvcik7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgICAgfVxuICAgIH0sXG5cblxuICAgIC8vIFVwZGF0ZXMgc291cmNlIGNvZGUgYmFzZWQgb24gdGhlIGNoYW5nZXMgcmVjZWl2ZWQgZnJvbSB0aGUgY2xpZW50XG4gICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xuICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZSgnL2FwaS9hcHBseS1lZGl0JywgYXN5bmMgKHJlcSwgcmVzLCBuZXh0KSA9PiB7XG4gICAgICAgIGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHJldHVybiBuZXh0KCk7XG5cbiAgICAgICAgbGV0IGJvZHkgPSAnJztcbiAgICAgICAgcmVxLm9uKCdkYXRhJywgY2h1bmsgPT4geyBib2R5ICs9IGNodW5rLnRvU3RyaW5nKCk7IH0pO1xuXG4gICAgICAgIHJlcS5vbignZW5kJywgYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGxldCBhYnNvbHV0ZUZpbGVQYXRoID0gJyc7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IHsgZWRpdElkLCBuZXdGdWxsVGV4dCB9ID0gSlNPTi5wYXJzZShib2R5KTtcblxuICAgICAgICAgICAgaWYgKCFlZGl0SWQgfHwgdHlwZW9mIG5ld0Z1bGxUZXh0ID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnTWlzc2luZyBlZGl0SWQgb3IgbmV3RnVsbFRleHQnIH0pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgcGFyc2VkSWQgPSBwYXJzZUVkaXRJZChlZGl0SWQpO1xuICAgICAgICAgICAgaWYgKCFwYXJzZWRJZCkge1xuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnSW52YWxpZCBlZGl0SWQgZm9ybWF0IChmaWxlUGF0aDpsaW5lOmNvbHVtbiknIH0pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgeyBmaWxlUGF0aCwgbGluZSwgY29sdW1uIH0gPSBwYXJzZWRJZDtcblxuICAgICAgICAgICAgYWJzb2x1dGVGaWxlUGF0aCA9IHBhdGgucmVzb2x2ZShWSVRFX1BST0pFQ1RfUk9PVCwgZmlsZVBhdGgpO1xuICAgICAgICAgICAgaWYgKGZpbGVQYXRoLmluY2x1ZGVzKCcuLicpIHx8ICFhYnNvbHV0ZUZpbGVQYXRoLnN0YXJ0c1dpdGgoVklURV9QUk9KRUNUX1JPT1QpIHx8IGFic29sdXRlRmlsZVBhdGguaW5jbHVkZXMoJ25vZGVfbW9kdWxlcycpKSB7XG4gICAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNDAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XG4gICAgICAgICAgICAgIHJldHVybiByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnZhbGlkIHBhdGgnIH0pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgb3JpZ2luYWxDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGFic29sdXRlRmlsZVBhdGgsICd1dGYtOCcpO1xuXG4gICAgICAgICAgICBjb25zdCBiYWJlbEFzdCA9IHBhcnNlKG9yaWdpbmFsQ29udGVudCwge1xuICAgICAgICAgICAgICBzb3VyY2VUeXBlOiAnbW9kdWxlJyxcbiAgICAgICAgICAgICAgcGx1Z2luczogWydqc3gnLCAndHlwZXNjcmlwdCddLFxuICAgICAgICAgICAgICBlcnJvclJlY292ZXJ5OiB0cnVlXG4gICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgbGV0IHRhcmdldE5vZGVQYXRoID0gbnVsbDtcbiAgICAgICAgICAgIGNvbnN0IHZpc2l0b3IgPSB7XG4gICAgICAgICAgICAgIEpTWE9wZW5pbmdFbGVtZW50KHBhdGgpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBub2RlID0gcGF0aC5ub2RlO1xuICAgICAgICAgICAgICAgIGlmIChub2RlLmxvYyAmJiBub2RlLmxvYy5zdGFydC5saW5lID09PSBsaW5lICYmIG5vZGUubG9jLnN0YXJ0LmNvbHVtbiArIDEgPT09IGNvbHVtbikge1xuICAgICAgICAgICAgICAgICAgdGFyZ2V0Tm9kZVBhdGggPSBwYXRoO1xuICAgICAgICAgICAgICAgICAgcGF0aC5zdG9wKCk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgdHJhdmVyc2VCYWJlbC5kZWZhdWx0KGJhYmVsQXN0LCB2aXNpdG9yKTtcblxuICAgICAgICAgICAgaWYgKCF0YXJnZXROb2RlUGF0aCkge1xuICAgICAgICAgICAgICByZXMud3JpdGVIZWFkKDQwNCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgICAgICAgICByZXR1cm4gcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnVGFyZ2V0IG5vZGUgbm90IGZvdW5kIGJ5IGxpbmUvY29sdW1uJywgZWRpdElkIH0pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3QgZ2VuZXJhdGVGdW5jdGlvbiA9IGdlbmVyYXRlLmRlZmF1bHQgfHwgZ2VuZXJhdGU7XG4gICAgICAgICAgICBjb25zdCBwYXJlbnRFbGVtZW50Tm9kZSA9IHRhcmdldE5vZGVQYXRoLnBhcmVudFBhdGg/Lm5vZGU7XG4gICAgICAgICAgICBsZXQgYmVmb3JlQ29kZSA9ICcnO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAocGFyZW50RWxlbWVudE5vZGUgJiYgdC5pc0pTWEVsZW1lbnQocGFyZW50RWxlbWVudE5vZGUpKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGJlZm9yZU91dHB1dCA9IGdlbmVyYXRlRnVuY3Rpb24ocGFyZW50RWxlbWVudE5vZGUsIHt9KTtcbiAgICAgICAgICAgICAgYmVmb3JlQ29kZSA9IGJlZm9yZU91dHB1dC5jb2RlO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBsZXQgbW9kaWZpZWQgPSBmYWxzZTtcblxuICAgICAgICAgICAgaWYgKHBhcmVudEVsZW1lbnROb2RlICYmIHQuaXNKU1hFbGVtZW50KHBhcmVudEVsZW1lbnROb2RlKSkge1xuICAgICAgICAgICAgICBwYXJlbnRFbGVtZW50Tm9kZS5jaGlsZHJlbiA9IFtdO1xuICAgICAgICAgICAgICBpZiAobmV3RnVsbFRleHQgJiYgbmV3RnVsbFRleHQudHJpbSgpICE9PSAnJykge1xuICAgICAgICAgICAgICAgIGNvbnN0IG5ld1RleHROb2RlID0gdC5qc3hUZXh0KG5ld0Z1bGxUZXh0KTtcbiAgICAgICAgICAgICAgICBwYXJlbnRFbGVtZW50Tm9kZS5jaGlsZHJlbi5wdXNoKG5ld1RleHROb2RlKTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBtb2RpZmllZCA9IHRydWU7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghbW9kaWZpZWQpIHtcbiAgICAgICAgICAgICAgcmVzLndyaXRlSGVhZCg0MDksIHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9KTtcbiAgICAgICAgICAgICAgcmV0dXJuIHJlcy5lbmQoSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ0NvdWxkIG5vdCBhcHBseSBjaGFuZ2VzIHRvIEFTVC4nIH0pKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgbGV0IGFmdGVyQ29kZSA9ICcnO1xuICAgICAgICAgICAgaWYgKHBhcmVudEVsZW1lbnROb2RlICYmIHQuaXNKU1hFbGVtZW50KHBhcmVudEVsZW1lbnROb2RlKSkge1xuICAgICAgICAgICAgICBjb25zdCBhZnRlck91dHB1dCA9IGdlbmVyYXRlRnVuY3Rpb24ocGFyZW50RWxlbWVudE5vZGUsIHt9KTtcbiAgICAgICAgICAgICAgYWZ0ZXJDb2RlID0gYWZ0ZXJPdXRwdXQuY29kZTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgY29uc3Qgb3V0cHV0ID0gZ2VuZXJhdGVGdW5jdGlvbihiYWJlbEFzdCwge30pO1xuICAgICAgICAgICAgY29uc3QgbmV3Q29udGVudCA9IG91dHB1dC5jb2RlO1xuXG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBmcy53cml0ZUZpbGVTeW5jKGFic29sdXRlRmlsZVBhdGgsIG5ld0NvbnRlbnQsICd1dGYtOCcpOyBcbiAgICAgICAgICAgIH0gY2F0Y2ggKHdyaXRlRXJyb3IpIHtcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgW3ZpdGVdW3Zpc3VhbC1lZGl0b3JdIEVycm9yIGR1cmluZyBkaXJlY3Qgd3JpdGUgZm9yICR7ZmlsZVBhdGh9OmAsIHdyaXRlRXJyb3IpO1xuICAgICAgICAgICAgICB0aHJvdyB3cml0ZUVycm9yO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXMud3JpdGVIZWFkKDIwMCwgeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0pO1xuICAgICAgICAgICAgcmVzLmVuZChKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgICAgICAgIHN1Y2Nlc3M6IHRydWUsIFxuICAgICAgICAgICAgICAgIG5ld0ZpbGVDb250ZW50OiBuZXdDb250ZW50LFxuICAgICAgICAgICAgICAgIGJlZm9yZUNvZGUsXG4gICAgICAgICAgICAgICAgYWZ0ZXJDb2RlLFxuICAgICAgICAgICAgfSkpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgIHJlcy53cml0ZUhlYWQoNTAwLCB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSk7XG4gICAgICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3IgZHVyaW5nIGVkaXQgYXBwbGljYXRpb24uJyB9KSk7XG4gICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcbn0gIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvdmFyL3d3dy9odG1sL2RmLWdyYWZpY2FzL3BsdWdpbnMvdmlzdWFsLWVkaXRvclwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL3Zhci93d3cvaHRtbC9kZi1ncmFmaWNhcy9wbHVnaW5zL3Zpc3VhbC1lZGl0b3Ivdml0ZS1wbHVnaW4tZWRpdC1tb2RlLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy92YXIvd3d3L2h0bWwvZGYtZ3JhZmljYXMvcGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLWVkaXQtbW9kZS5qc1wiO2ltcG9ydCB7IHJlYWRGaWxlU3luYyB9IGZyb20gJ2ZzJztcbmltcG9ydCB7IHJlc29sdmUgfSBmcm9tICdwYXRoJztcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICd1cmwnO1xuXG4vLyBJbmxpbmUgc3R5bGVzIGZyb20gdmlzdWFsLWVkaXRvci1jb25maWcuanMgdG8gYXZvaWQgaW1wb3J0IGlzc3Vlc1xuY29uc3QgRURJVF9NT0RFX1NUWUxFUyA9IGBcbiAgI3Jvb3RbZGF0YS1lZGl0LW1vZGUtZW5hYmxlZD1cInRydWVcIl0gW2RhdGEtZWRpdC1pZF0ge1xuICAgIGN1cnNvcjogcG9pbnRlcjsgXG4gICAgb3V0bGluZTogMXB4IGRhc2hlZCAjMzU3REY5OyBcbiAgICBvdXRsaW5lLW9mZnNldDogMnB4O1xuICAgIG1pbi1oZWlnaHQ6IDFlbTtcbiAgfVxuICAjcm9vdFtkYXRhLWVkaXQtbW9kZS1lbmFibGVkPVwidHJ1ZVwiXSB7XG4gICAgY3Vyc29yOiBwb2ludGVyO1xuICB9XG4gICNyb290W2RhdGEtZWRpdC1tb2RlLWVuYWJsZWQ9XCJ0cnVlXCJdIFtkYXRhLWVkaXQtaWRdOmhvdmVyIHtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMzU3REY5MzM7XG4gICAgb3V0bGluZS1jb2xvcjogIzM1N0RGOTsgXG4gIH1cblxuICBAa2V5ZnJhbWVzIGZhZGVJblRvb2x0aXAge1xuICAgIGZyb20ge1xuICAgICAgb3BhY2l0eTogMDtcbiAgICAgIHRyYW5zZm9ybTogdHJhbnNsYXRlWSg1cHgpO1xuICAgIH1cbiAgICB0byB7XG4gICAgICBvcGFjaXR5OiAxO1xuICAgICAgdHJhbnNmb3JtOiB0cmFuc2xhdGVZKDApO1xuICAgIH1cbiAgfVxuXG4gICNpbmxpbmUtZWRpdG9yLWRpc2FibGVkLXRvb2x0aXAge1xuICAgIGRpc3BsYXk6IG5vbmU7IFxuICAgIG9wYWNpdHk6IDA7IFxuICAgIHBvc2l0aW9uOiBhYnNvbHV0ZTtcbiAgICBiYWNrZ3JvdW5kLWNvbG9yOiAjMUQxRTIwO1xuICAgIGNvbG9yOiB3aGl0ZTtcbiAgICBwYWRkaW5nOiA0cHggOHB4O1xuICAgIGJvcmRlci1yYWRpdXM6IDhweDtcbiAgICB6LWluZGV4OiAxMDAwMTtcbiAgICBmb250LXNpemU6IDE0cHg7XG4gICAgYm9yZGVyOiAxcHggc29saWQgIzNCM0Q0QTtcbiAgICBtYXgtd2lkdGg6IDE4NHB4O1xuICAgIHRleHQtYWxpZ246IGNlbnRlcjtcbiAgfVxuXG4gICNpbmxpbmUtZWRpdG9yLWRpc2FibGVkLXRvb2x0aXAudG9vbHRpcC1hY3RpdmUge1xuICAgIGRpc3BsYXk6IGJsb2NrO1xuICAgIGFuaW1hdGlvbjogZmFkZUluVG9vbHRpcCAwLjJzIGVhc2Utb3V0IGZvcndhcmRzO1xuICB9XG5gO1xuXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpO1xuY29uc3QgX19kaXJuYW1lID0gcmVzb2x2ZShfX2ZpbGVuYW1lLCAnLi4nKTtcblxuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gaW5saW5lRWRpdERldlBsdWdpbigpIHtcbiAgcmV0dXJuIHtcbiAgICBuYW1lOiAndml0ZTppbmxpbmUtZWRpdC1kZXYnLFxuICAgIGFwcGx5OiAnc2VydmUnLFxuICAgIHRyYW5zZm9ybUluZGV4SHRtbCgpIHtcbiAgICAgIGNvbnN0IHNjcmlwdFBhdGggPSByZXNvbHZlKF9fZGlybmFtZSwgJ2VkaXQtbW9kZS1zY3JpcHQuanMnKTtcbiAgICAgIGNvbnN0IHNjcmlwdENvbnRlbnQgPSByZWFkRmlsZVN5bmMoc2NyaXB0UGF0aCwgJ3V0Zi04Jyk7XG5cbiAgICAgIHJldHVybiBbXG4gICAgICAgIHtcbiAgICAgICAgICB0YWc6ICdzY3JpcHQnLFxuICAgICAgICAgIGF0dHJzOiB7IHR5cGU6ICdtb2R1bGUnIH0sXG4gICAgICAgICAgY2hpbGRyZW46IHNjcmlwdENvbnRlbnQsXG4gICAgICAgICAgaW5qZWN0VG86ICdib2R5J1xuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgdGFnOiAnc3R5bGUnLFxuICAgICAgICAgIGNoaWxkcmVuOiBFRElUX01PREVfU1RZTEVTLFxuICAgICAgICAgIGluamVjdFRvOiAnaGVhZCdcbiAgICAgICAgfVxuICAgICAgXTtcbiAgICB9XG4gIH07XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi92YXIvd3d3L2h0bWwvZGYtZ3JhZmljYXNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi92YXIvd3d3L2h0bWwvZGYtZ3JhZmljYXMvdml0ZS5jb25maWcuanNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL3Zhci93d3cvaHRtbC9kZi1ncmFmaWNhcy92aXRlLmNvbmZpZy5qc1wiO2ltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHsgY3JlYXRlTG9nZ2VyLCBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcblxuY29uc3QgaXNEZXYgPSBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nO1xubGV0IGlubGluZUVkaXRQbHVnaW4sIGVkaXRNb2RlRGV2UGx1Z2luO1xuXG5pZiAoaXNEZXYpIHtcblx0aW5saW5lRWRpdFBsdWdpbiA9IChhd2FpdCBpbXBvcnQoJy4vcGx1Z2lucy92aXN1YWwtZWRpdG9yL3ZpdGUtcGx1Z2luLXJlYWN0LWlubGluZS1lZGl0b3IuanMnKSkuZGVmYXVsdDtcblx0ZWRpdE1vZGVEZXZQbHVnaW4gPSAoYXdhaXQgaW1wb3J0KCcuL3BsdWdpbnMvdmlzdWFsLWVkaXRvci92aXRlLXBsdWdpbi1lZGl0LW1vZGUuanMnKSkuZGVmYXVsdDtcbn1cblxuY29uc3QgY29uZmlnSG9yaXpvbnNWaXRlRXJyb3JIYW5kbGVyID0gYFxuY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgTXV0YXRpb25PYnNlcnZlcigobXV0YXRpb25zKSA9PiB7XG5cdGZvciAoY29uc3QgbXV0YXRpb24gb2YgbXV0YXRpb25zKSB7XG5cdFx0Zm9yIChjb25zdCBhZGRlZE5vZGUgb2YgbXV0YXRpb24uYWRkZWROb2Rlcykge1xuXHRcdFx0aWYgKFxuXHRcdFx0XHRhZGRlZE5vZGUubm9kZVR5cGUgPT09IE5vZGUuRUxFTUVOVF9OT0RFICYmXG5cdFx0XHRcdChcblx0XHRcdFx0XHRhZGRlZE5vZGUudGFnTmFtZT8udG9Mb3dlckNhc2UoKSA9PT0gJ3ZpdGUtZXJyb3Itb3ZlcmxheScgfHxcblx0XHRcdFx0XHRhZGRlZE5vZGUuY2xhc3NMaXN0Py5jb250YWlucygnYmFja2Ryb3AnKVxuXHRcdFx0XHQpXG5cdFx0XHQpIHtcblx0XHRcdFx0aGFuZGxlVml0ZU92ZXJsYXkoYWRkZWROb2RlKTtcblx0XHRcdH1cblx0XHR9XG5cdH1cbn0pO1xuXG5vYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmRvY3VtZW50RWxlbWVudCwge1xuXHRjaGlsZExpc3Q6IHRydWUsXG5cdHN1YnRyZWU6IHRydWVcbn0pO1xuXG5mdW5jdGlvbiBoYW5kbGVWaXRlT3ZlcmxheShub2RlKSB7XG5cdGlmICghbm9kZS5zaGFkb3dSb290KSB7XG5cdFx0cmV0dXJuO1xuXHR9XG5cblx0Y29uc3QgYmFja2Ryb3AgPSBub2RlLnNoYWRvd1Jvb3QucXVlcnlTZWxlY3RvcignLmJhY2tkcm9wJyk7XG5cblx0aWYgKGJhY2tkcm9wKSB7XG5cdFx0Y29uc3Qgb3ZlcmxheUh0bWwgPSBiYWNrZHJvcC5vdXRlckhUTUw7XG5cdFx0Y29uc3QgcGFyc2VyID0gbmV3IERPTVBhcnNlcigpO1xuXHRcdGNvbnN0IGRvYyA9IHBhcnNlci5wYXJzZUZyb21TdHJpbmcob3ZlcmxheUh0bWwsICd0ZXh0L2h0bWwnKTtcblx0XHRjb25zdCBtZXNzYWdlQm9keUVsZW1lbnQgPSBkb2MucXVlcnlTZWxlY3RvcignLm1lc3NhZ2UtYm9keScpO1xuXHRcdGNvbnN0IGZpbGVFbGVtZW50ID0gZG9jLnF1ZXJ5U2VsZWN0b3IoJy5maWxlJyk7XG5cdFx0Y29uc3QgbWVzc2FnZVRleHQgPSBtZXNzYWdlQm9keUVsZW1lbnQgPyBtZXNzYWdlQm9keUVsZW1lbnQudGV4dENvbnRlbnQudHJpbSgpIDogJyc7XG5cdFx0Y29uc3QgZmlsZVRleHQgPSBmaWxlRWxlbWVudCA/IGZpbGVFbGVtZW50LnRleHRDb250ZW50LnRyaW0oKSA6ICcnO1xuXHRcdGNvbnN0IGVycm9yID0gbWVzc2FnZVRleHQgKyAoZmlsZVRleHQgPyAnIEZpbGU6JyArIGZpbGVUZXh0IDogJycpO1xuXG5cdFx0d2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7XG5cdFx0XHR0eXBlOiAnaG9yaXpvbnMtdml0ZS1lcnJvcicsXG5cdFx0XHRlcnJvcixcblx0XHR9LCAnKicpO1xuXHR9XG59XG5gO1xuXG5jb25zdCBjb25maWdIb3Jpem9uc1J1bnRpbWVFcnJvckhhbmRsZXIgPSBgXG53aW5kb3cub25lcnJvciA9IChtZXNzYWdlLCBzb3VyY2UsIGxpbmVubywgY29sbm8sIGVycm9yT2JqKSA9PiB7XG5cdGNvbnN0IGVycm9yRGV0YWlscyA9IGVycm9yT2JqID8gSlNPTi5zdHJpbmdpZnkoe1xuXHRcdG5hbWU6IGVycm9yT2JqLm5hbWUsXG5cdFx0bWVzc2FnZTogZXJyb3JPYmoubWVzc2FnZSxcblx0XHRzdGFjazogZXJyb3JPYmouc3RhY2ssXG5cdFx0c291cmNlLFxuXHRcdGxpbmVubyxcblx0XHRjb2xubyxcblx0fSkgOiBudWxsO1xuXG5cdHdpbmRvdy5wYXJlbnQucG9zdE1lc3NhZ2Uoe1xuXHRcdHR5cGU6ICdob3Jpem9ucy1ydW50aW1lLWVycm9yJyxcblx0XHRtZXNzYWdlLFxuXHRcdGVycm9yOiBlcnJvckRldGFpbHNcblx0fSwgJyonKTtcbn07XG5gO1xuXG5jb25zdCBjb25maWdIb3Jpem9uc0NvbnNvbGVFcnJyb0hhbmRsZXIgPSBgXG5jb25zdCBvcmlnaW5hbENvbnNvbGVFcnJvciA9IGNvbnNvbGUuZXJyb3I7XG5jb25zb2xlLmVycm9yID0gZnVuY3Rpb24oLi4uYXJncykge1xuXHRvcmlnaW5hbENvbnNvbGVFcnJvci5hcHBseShjb25zb2xlLCBhcmdzKTtcblxuXHRsZXQgZXJyb3JTdHJpbmcgPSAnJztcblxuXHRmb3IgKGxldCBpID0gMDsgaSA8IGFyZ3MubGVuZ3RoOyBpKyspIHtcblx0XHRjb25zdCBhcmcgPSBhcmdzW2ldO1xuXHRcdGlmIChhcmcgaW5zdGFuY2VvZiBFcnJvcikge1xuXHRcdFx0ZXJyb3JTdHJpbmcgPSBhcmcuc3RhY2sgfHwgXFxgXFwke2FyZy5uYW1lfTogXFwke2FyZy5tZXNzYWdlfVxcYDtcblx0XHRcdGJyZWFrO1xuXHRcdH1cblx0fVxuXG5cdGlmICghZXJyb3JTdHJpbmcpIHtcblx0XHRlcnJvclN0cmluZyA9IGFyZ3MubWFwKGFyZyA9PiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyA/IEpTT04uc3RyaW5naWZ5KGFyZykgOiBTdHJpbmcoYXJnKSkuam9pbignICcpO1xuXHR9XG5cblx0d2luZG93LnBhcmVudC5wb3N0TWVzc2FnZSh7XG5cdFx0dHlwZTogJ2hvcml6b25zLWNvbnNvbGUtZXJyb3InLFxuXHRcdGVycm9yOiBlcnJvclN0cmluZ1xuXHR9LCAnKicpO1xufTtcbmA7XG5cbmNvbnN0IGNvbmZpZ1dpbmRvd0ZldGNoTW9ua2V5UGF0Y2ggPSBgXG5jb25zdCBvcmlnaW5hbEZldGNoID0gd2luZG93LmZldGNoO1xuXG53aW5kb3cuZmV0Y2ggPSBmdW5jdGlvbiguLi5hcmdzKSB7XG5cdGNvbnN0IHVybCA9IGFyZ3NbMF0gaW5zdGFuY2VvZiBSZXF1ZXN0ID8gYXJnc1swXS51cmwgOiBhcmdzWzBdO1xuXG5cdC8vIFNraXAgV2ViU29ja2V0IFVSTHNcblx0aWYgKHVybC5zdGFydHNXaXRoKCd3czonKSB8fCB1cmwuc3RhcnRzV2l0aCgnd3NzOicpKSB7XG5cdFx0cmV0dXJuIG9yaWdpbmFsRmV0Y2guYXBwbHkodGhpcywgYXJncyk7XG5cdH1cblxuXHRyZXR1cm4gb3JpZ2luYWxGZXRjaC5hcHBseSh0aGlzLCBhcmdzKVxuXHRcdC50aGVuKGFzeW5jIHJlc3BvbnNlID0+IHtcblx0XHRcdGNvbnN0IGNvbnRlbnRUeXBlID0gcmVzcG9uc2UuaGVhZGVycy5nZXQoJ0NvbnRlbnQtVHlwZScpIHx8ICcnO1xuXG5cdFx0XHQvLyBFeGNsdWRlIEhUTUwgZG9jdW1lbnQgcmVzcG9uc2VzXG5cdFx0XHRjb25zdCBpc0RvY3VtZW50UmVzcG9uc2UgPVxuXHRcdFx0XHRjb250ZW50VHlwZS5pbmNsdWRlcygndGV4dC9odG1sJykgfHxcblx0XHRcdFx0Y29udGVudFR5cGUuaW5jbHVkZXMoJ2FwcGxpY2F0aW9uL3hodG1sK3htbCcpO1xuXG5cdFx0XHRpZiAoIXJlc3BvbnNlLm9rICYmICFpc0RvY3VtZW50UmVzcG9uc2UpIHtcblx0XHRcdFx0XHRjb25zdCByZXNwb25zZUNsb25lID0gcmVzcG9uc2UuY2xvbmUoKTtcblx0XHRcdFx0XHRjb25zdCBlcnJvckZyb21SZXMgPSBhd2FpdCByZXNwb25zZUNsb25lLnRleHQoKTtcblx0XHRcdFx0XHRjb25zdCByZXF1ZXN0VXJsID0gcmVzcG9uc2UudXJsO1xuXHRcdFx0XHRcdGNvbnNvbGUuZXJyb3IoXFxgRmV0Y2ggZXJyb3IgZnJvbSBcXCR7cmVxdWVzdFVybH06IFxcJHtlcnJvckZyb21SZXN9XFxgKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHJlc3BvbnNlO1xuXHRcdH0pXG5cdFx0LmNhdGNoKGVycm9yID0+IHtcblx0XHRcdGlmICghdXJsLm1hdGNoKC9cXC5odG1sPyQvaSkpIHtcblx0XHRcdFx0Y29uc29sZS5lcnJvcihlcnJvcik7XG5cdFx0XHR9XG5cblx0XHRcdHRocm93IGVycm9yO1xuXHRcdH0pO1xufTtcbmA7XG5cbmNvbnN0IGFkZFRyYW5zZm9ybUluZGV4SHRtbCA9IHtcblx0bmFtZTogJ2FkZC10cmFuc2Zvcm0taW5kZXgtaHRtbCcsXG5cdHRyYW5zZm9ybUluZGV4SHRtbChodG1sKSB7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGh0bWwsXG5cdFx0XHR0YWdzOiBbXG5cdFx0XHRcdHtcblx0XHRcdFx0XHR0YWc6ICdzY3JpcHQnLFxuXHRcdFx0XHRcdGF0dHJzOiB7IHR5cGU6ICdtb2R1bGUnIH0sXG5cdFx0XHRcdFx0Y2hpbGRyZW46IGNvbmZpZ0hvcml6b25zUnVudGltZUVycm9ySGFuZGxlcixcblx0XHRcdFx0XHRpbmplY3RUbzogJ2hlYWQnLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGFnOiAnc2NyaXB0Jyxcblx0XHRcdFx0XHRhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxuXHRcdFx0XHRcdGNoaWxkcmVuOiBjb25maWdIb3Jpem9uc1ZpdGVFcnJvckhhbmRsZXIsXG5cdFx0XHRcdFx0aW5qZWN0VG86ICdoZWFkJyxcblx0XHRcdFx0fSxcblx0XHRcdFx0e1xuXHRcdFx0XHRcdHRhZzogJ3NjcmlwdCcsXG5cdFx0XHRcdFx0YXR0cnM6IHt0eXBlOiAnbW9kdWxlJ30sXG5cdFx0XHRcdFx0Y2hpbGRyZW46IGNvbmZpZ0hvcml6b25zQ29uc29sZUVycnJvSGFuZGxlcixcblx0XHRcdFx0XHRpbmplY3RUbzogJ2hlYWQnLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHR7XG5cdFx0XHRcdFx0dGFnOiAnc2NyaXB0Jyxcblx0XHRcdFx0XHRhdHRyczogeyB0eXBlOiAnbW9kdWxlJyB9LFxuXHRcdFx0XHRcdGNoaWxkcmVuOiBjb25maWdXaW5kb3dGZXRjaE1vbmtleVBhdGNoLFxuXHRcdFx0XHRcdGluamVjdFRvOiAnaGVhZCcsXG5cdFx0XHRcdH0sXG5cdFx0XHRdLFxuXHRcdH07XG5cdH0sXG59O1xuXG5jb25zb2xlLndhcm4gPSAoKSA9PiB7fTtcblxuY29uc3QgbG9nZ2VyID0gY3JlYXRlTG9nZ2VyKClcbmNvbnN0IGxvZ2dlckVycm9yID0gbG9nZ2VyLmVycm9yXG5cbmxvZ2dlci5lcnJvciA9IChtc2csIG9wdGlvbnMpID0+IHtcblx0aWYgKG9wdGlvbnM/LmVycm9yPy50b1N0cmluZygpLmluY2x1ZGVzKCdDc3NTeW50YXhFcnJvcjogW3Bvc3Rjc3NdJykpIHtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRsb2dnZXJFcnJvcihtc2csIG9wdGlvbnMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBjdXN0b21Mb2dnZXI6IGxvZ2dlcixcbiAgLy8gQ2FycmVnYSBhcyB2YXJpXHUwMEUxdmVpcyBkZSBhbWJpZW50ZSBkbyBhcnF1aXZvIC5lbnYgY29ycmVzcG9uZGVudGVcbiAgZW52RGlyOiAnLicsXG4gIGRlZmluZToge1xuICAgICdpbXBvcnQubWV0YS5lbnYnOiBKU09OLnN0cmluZ2lmeShwcm9jZXNzLmVudilcbiAgfSxcbiAgc2VydmVyOiB7XG4gICAgcG9ydDogNTE4MCxcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxuICAgIG9wZW46IHRydWUsXG4gICAgaG9zdDogJ2xvY2FsaG9zdCcsXG4gICAgY29yczogdHJ1ZSxcbiAgICBoZWFkZXJzOiB7XG4gICAgICAnQ3Jvc3MtT3JpZ2luLUVtYmVkZGVyLVBvbGljeSc6ICdjcmVkZW50aWFsbGVzcycsXG4gICAgfSxcbiAgICBhbGxvd2VkSG9zdHM6IHRydWUsXG4gICAgaG1yOiB7XG4gICAgICBwb3J0OiA1MTgxLFxuICAgICAgaG9zdDogJ2xvY2FsaG9zdCdcbiAgICB9LFxuICAgIHByb3h5OiB7XG4gICAgICAnL2FwaSc6IHtcbiAgICAgICAgdGFyZ2V0OiBwcm9jZXNzLmVudi5WSVRFX0FQSV9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMScsXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgc2VjdXJlOiBmYWxzZSxcbiAgICAgICAgd3M6IHRydWUsXG4gICAgICAgIHJvdXRlcjoge1xuICAgICAgICAgIC8vIENvbmZpZ3VyYVx1MDBFN1x1MDBFM28gcGFyYSBhY2VpdGFyIG1cdTAwRkFsdGlwbG9zIGRvbVx1MDBFRG5pb3NcbiAgICAgICAgICAnaHR0cHM6Ly9zaXN0ZW1hLWdyYWZpY2FzLmRmaW5mb3JtYXRpY2EubmV0JzogJ2h0dHBzOi8vc2lzdGVtYS1ncmFmaWNhcy5kZmluZm9ybWF0aWNhLm5ldC9iYWNrZW5kJyxcbiAgICAgICAgICAnaHR0cHM6Ly93d3cuc2lzdGVtYS1ncmFmaWNhcy5kZmluZm9ybWF0aWNhLm5ldCc6ICdodHRwczovL3d3dy5zaXN0ZW1hLWdyYWZpY2FzLmRmaW5mb3JtYXRpY2EubmV0L2JhY2tlbmQnLFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuXHRwbHVnaW5zOiBbXG5cdFx0Li4uKGlzRGV2ID8gW2lubGluZUVkaXRQbHVnaW4oKSwgZWRpdE1vZGVEZXZQbHVnaW4oKV0gOiBbXSksXG5cdFx0cmVhY3QoKSxcblx0XHRhZGRUcmFuc2Zvcm1JbmRleEh0bWxcblx0XSxcblx0cmVzb2x2ZToge1xuXHRcdGV4dGVuc2lvbnM6IFsnLmpzeCcsICcuanMnLCAnLnRzeCcsICcudHMnLCAnLmpzb24nLCBdLFxuXHRcdGFsaWFzOiB7XG5cdFx0XHQnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuXHRcdH0sXG5cdH0sXG5cdGJ1aWxkOiB7XG5cdFx0cm9sbHVwT3B0aW9uczoge1xuXHRcdFx0ZXh0ZXJuYWw6IFtcblx0XHRcdFx0J0BiYWJlbC9wYXJzZXInLFxuXHRcdFx0XHQnQGJhYmVsL3RyYXZlcnNlJyxcblx0XHRcdFx0J0BiYWJlbC9nZW5lcmF0b3InLFxuXHRcdFx0XHQnQGJhYmVsL3R5cGVzJ1xuXHRcdFx0XVxuXHRcdH1cblx0fSxcblx0b3B0aW1pemVEZXBzOiB7XG5cdFx0aW5jbHVkZTogW1xuXHRcdFx0J3JlYWN0Jyxcblx0XHRcdCdyZWFjdC1kb20nLFxuXHRcdFx0J3JlYWN0LXJvdXRlci1kb20nLFxuXHRcdFx0J2x1Y2lkZS1yZWFjdCdcblx0XHRdXG5cdH1cbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUF1VyxPQUFPLFVBQVU7QUFDeFgsU0FBUyxxQkFBcUI7QUFDOUIsU0FBUyxhQUFhO0FBQ3RCLE9BQU8sbUJBQW1CO0FBQzFCLE9BQU8sY0FBYztBQUNyQixZQUFZLE9BQU87QUFDbkIsT0FBTyxRQUFRO0FBT2YsU0FBUyxZQUFZLFFBQVE7QUFDM0IsUUFBTSxRQUFR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QUM5QyxrREFBa0Q7QUFBQSxRQUNwRDtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBQ0QsU0FBUztBQUFBLElBQ1IsR0FBSSxRQUFRLENBQUNBLGtCQUFpQixHQUFHLGtCQUFrQixDQUFDLElBQUksQ0FBQztBQUFBLElBQ3pELE1BQU07QUFBQSxJQUNOO0FBQUEsRUFDRDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1IsWUFBWSxDQUFDLFFBQVEsT0FBTyxRQUFRLE9BQU8sT0FBUztBQUFBLElBQ3BELE9BQU87QUFBQSxNQUNOLEtBQUtDLE1BQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDckM7QUFBQSxFQUNEO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTixlQUFlO0FBQUEsTUFDZCxVQUFVO0FBQUEsUUFDVDtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLE1BQ0Q7QUFBQSxJQUNEO0FBQUEsRUFDRDtBQUFBLEVBQ0EsY0FBYztBQUFBLElBQ2IsU0FBUztBQUFBLE1BQ1I7QUFBQSxNQUNBO0FBQUEsTUFDQTtBQUFBLE1BQ0E7QUFBQSxJQUNEO0FBQUEsRUFDRDtBQUNELENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiLCAiX19kaXJuYW1lIiwgImZpbGVVUkxUb1BhdGgiLCAiX19kaXJuYW1lIiwgIl9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwiLCAiX19maWxlbmFtZSIsICJwYXRoIiwgImlubGluZUVkaXRQbHVnaW4iLCAicGF0aCJdCn0K
