window.__ModuleLoader__.load({
	id: "dsh-better-sidebar-svn",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_dsh_client_ui_primitives3 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_react3 = require("react");

// src/client/SvnDiffTab.tsx
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");

// src/client/api.ts
var SvnApiError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
  code;
};
async function call(method, payload) {
  let response;
  try {
    response = await fetch(`/sidebar/api/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (error) {
    throw new SvnApiError("network", error instanceof Error ? error.message : String(error));
  }
  const parsed = await response.json().catch(() => null);
  if (!response.ok || parsed === null || parsed.ok !== true || parsed.value === void 0) {
    throw new SvnApiError(
      parsed?.error?.code ?? "http",
      parsed?.error?.message ?? `HTTP ${response.status}`
    );
  }
  return parsed.value;
}
function scopePayload(scope, extra) {
  return {
    sessionId: scope.sessionId,
    ...scope.cwd !== void 0 && scope.cwd !== "" ? { cwd: scope.cwd } : {},
    ...extra
  };
}
var svnApi = {
  /** 获取 SVN 工作副本状态。 */
  status: (scope) => call("svn.status", scopePayload(scope, {})),
  /** 获取 diff：工作副本某文件的变更，或某版本的完整补丁。 */
  diff: (scope, path, rev) => call("svn.diff", scopePayload(scope, {
    ...path !== void 0 ? { path } : {},
    ...rev !== void 0 ? { rev } : {}
  })),
  /** 添加文件到版本控制。 */
  add: (scope, paths) => call("svn.add", scopePayload(scope, { paths })),
  /** 还原文件修改。 */
  revert: (scope, paths) => call("svn.revert", scopePayload(scope, { paths })),
  /** 提交变更。 */
  commit: (scope, message) => call("svn.commit", scopePayload(scope, { message })),
  /** 更新工作副本。 */
  update: (scope) => call("svn.update", scopePayload(scope, {})),
  /** 提交历史。 */
  log: (scope, limit, offset) => call("svn.log", scopePayload(scope, {
    ...limit !== void 0 ? { limit } : {},
    ...offset !== void 0 ? { offset } : {}
  })),
  /** 获取某版本文件内容。 */
  cat: (scope, rev, path) => call("svn.cat", scopePayload(scope, { rev, path })),
  /** 获取仓库信息。 */
  info: (scope) => call("svn.info", scopePayload(scope, {})),
  /** 解决冲突。 */
  resolve: (scope, path, accept) => call("svn.resolve", scopePayload(scope, {
    path,
    ...accept !== void 0 ? { accept } : {}
  })),
  /** 撤销某次提交（改动落回工作副本）。 */
  revertRevision: (scope, revision) => call("svn.revertRevision", scopePayload(scope, { revision }))
};

// src/client/SvnDiffTab.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function parseHunkHeader(line) {
  const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/.exec(line);
  if (match === null) return null;
  return { oldStart: Number(match[1]), newStart: Number(match[3]), header: match[5] ?? "" };
}
function parseUnifiedDiff(text) {
  const files = [];
  const lines = text.split("\n");
  let file = null;
  let hunk = null;
  let oldNum = 0;
  let newNum = 0;
  for (const line of lines) {
    if (line.startsWith("--- ")) {
      file = {
        oldPath: line.slice(4).split("	")[0]?.trim() ?? "",
        newPath: "",
        binary: false,
        hunks: []
      };
      files.push(file);
      hunk = null;
      continue;
    }
    if (line.startsWith("+++ ") && file !== null) {
      file.newPath = line.slice(4).split("	")[0]?.trim() ?? "";
      continue;
    }
    if (line.startsWith("Binary file") && file !== null) {
      file.binary = true;
      continue;
    }
    const header = parseHunkHeader(line);
    if (header !== null && file !== null) {
      hunk = { ...header, lines: [] };
      file.hunks.push(hunk);
      oldNum = header.oldStart;
      newNum = header.newStart;
      hunk.lines.push({ kind: "meta", text: line, oldNum: null, newNum: null });
      continue;
    }
    if (hunk === null) continue;
    if (line.startsWith("+")) {
      hunk.lines.push({ kind: "add", text: line.slice(1), oldNum: null, newNum });
      newNum += 1;
    } else if (line.startsWith("-")) {
      hunk.lines.push({ kind: "del", text: line.slice(1), oldNum, newNum: null });
      oldNum += 1;
    } else if (line.startsWith(" ")) {
      hunk.lines.push({ kind: "ctx", text: line.slice(1), oldNum, newNum });
      oldNum += 1;
      newNum += 1;
    } else if (line.startsWith("\\")) {
      hunk.lines.push({ kind: "meta", text: line, oldNum: null, newNum: null });
    }
  }
  return files;
}
function SvnDiffTab(props) {
  const { scope, meta } = props;
  const [loading, setLoading] = (0, import_react.useState)(true);
  const [error, setError] = (0, import_react.useState)(null);
  const [diff, setDiff] = (0, import_react.useState)(null);
  const [tick, setTick] = (0, import_react.useState)(0);
  const refresh = (0, import_react.useCallback)(() => {
    setTick((value) => value + 1);
  }, []);
  (0, import_react.useEffect)(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDiff(null);
    const load = async () => {
      try {
        const result = meta.kind === "commit" ? await svnApi.diff(scope, void 0, meta.revision) : await svnApi.diff(scope, meta.path);
        if (!cancelled) setDiff(result.diff);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [scope.sessionId, scope.cwd, meta, tick]);
  const title = meta.kind === "commit" ? `r${meta.revision ?? ""} ${meta.subject ?? ""}` : meta.path ?? "";
  const renderLine = (line, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `svn-diff-line svn-diff-${line.kind}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "svn-diff-num", children: line.oldNum ?? "" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "svn-diff-num", children: line.newNum ?? "" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "svn-diff-code", children: line.text })
  ] }, index);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "svn-difftab", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "svn-difftab-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "svn-difftab-title", title, children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "button",
        {
          type: "button",
          className: "svn-iconbtn",
          "aria-label": "\u5237\u65B0",
          title: "\u5237\u65B0",
          onClick: refresh,
          children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconRefreshOutline16, { size: 14 })
        }
      )
    ] }),
    loading && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "svn-placeholder", children: "\u52A0\u8F7D diff..." }),
    !loading && error !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "svn-error", children: error }),
    !loading && error === null && (diff === null || diff === "") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "svn-placeholder", children: "\u65E0\u6587\u672C\u53D8\u66F4" }),
    !loading && error === null && diff !== null && diff !== "" && parseUnifiedDiff(diff).map((file, fileIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "svn-diff-file", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "svn-diff-fileheader", title: file.newPath || file.oldPath, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "svn-diff-filepath", children: file.newPath || file.oldPath }),
        file.oldPath !== "" && file.newPath !== "" && file.oldPath !== file.newPath && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "svn-diff-fileold", children: file.oldPath })
      ] }),
      file.binary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "svn-placeholder", children: "\u4E8C\u8FDB\u5236\u6587\u4EF6" }),
      file.hunks.map((hunk, hunkIndex) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "svn-diff-hunk", children: hunk.lines.map((line, lineIndex) => renderLine(line, lineIndex)) }, hunkIndex))
    ] }, fileIndex))
  ] });
}

// src/client/SvnView.tsx
var import_react2 = require("react");
var import_dsh_client_ui_primitives2 = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime2 = require("react/jsx-runtime");
var STATUS_LABELS = {
  modified: "M",
  added: "A",
  deleted: "D",
  conflicted: "C",
  replaced: "R",
  unversioned: "?",
  missing: "!",
  normal: ""
};
var STATUS_CLASSES = {
  modified: "svn-status-modified",
  added: "svn-status-added",
  deleted: "svn-status-deleted",
  conflicted: "svn-status-conflicted",
  replaced: "svn-status-replaced",
  unversioned: "svn-status-unversioned",
  missing: "svn-status-missing",
  normal: ""
};
function isVersionedChange(entry) {
  return entry.status !== "unversioned" && entry.status !== "normal" && entry.status !== "missing";
}
function baseName(path) {
  const at = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return at === -1 ? path : path.slice(at + 1);
}
function relativeTime(iso) {
  const now = Date.now();
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const diff = Math.max(0, now - then);
  if (diff < 6e4) return "\u521A\u521A";
  if (diff < 36e5) return `${Math.floor(diff / 6e4)} \u5206\u949F\u524D`;
  if (diff < 864e5) return `${Math.floor(diff / 36e5)} \u5C0F\u65F6\u524D`;
  if (diff < 30 * 864e5) return `${Math.floor(diff / 864e5)} \u5929\u524D`;
  return `${Math.floor(diff / (365 * 864e5))} \u5E74\u524D`;
}
function absolutePath(cwd, path) {
  if (path.startsWith("/") || path.startsWith("\\") || /^[a-zA-Z]:[\\/]/.test(path)) return path;
  const base = cwd ?? "";
  if (base === "") return path;
  return `${base.replace(/[\\/]$/, "")}/${path}`;
}
var LOG_BATCH = 20;
function SvnView(props) {
  const { scope, betterSidebar, onOpenFile } = props;
  const [status, setStatus] = (0, import_react2.useState)(null);
  const [loading, setLoading] = (0, import_react2.useState)(true);
  const [error, setError] = (0, import_react2.useState)(null);
  const [logEntries, setLogEntries] = (0, import_react2.useState)([]);
  const [commitMsg, setCommitMsg] = (0, import_react2.useState)("");
  const [busy, setBusy] = (0, import_react2.useState)(false);
  const [actionError, setActionError] = (0, import_react2.useState)(null);
  const [logEnded, setLogEnded] = (0, import_react2.useState)(false);
  const [logLoadingMore, setLogLoadingMore] = (0, import_react2.useState)(false);
  const [fileMenu, setFileMenu] = (0, import_react2.useState)(null);
  const [historyMenu, setHistoryMenu] = (0, import_react2.useState)(null);
  const [confirm, setConfirm] = (0, import_react2.useState)(null);
  const refresh = (0, import_react2.useCallback)(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusResult, logResult] = await Promise.all([
        svnApi.status(scope),
        // 只取历史第一页，其余通过「加载更多」补齐。
        svnApi.log(scope, LOG_BATCH, 0).catch(() => [])
      ]);
      setStatus(statusResult);
      setLogEntries(logResult);
      setLogEnded(logResult.length < LOG_BATCH);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setLoading(false);
    }
  }, [scope.sessionId, scope.cwd]);
  (0, import_react2.useEffect)(() => {
    void refresh();
  }, [refresh]);
  const loadMoreLog = async () => {
    if (logLoadingMore || logEnded) return;
    setLogLoadingMore(true);
    try {
      const next = await svnApi.log(scope, LOG_BATCH, logEntries.length);
      setLogEntries((entries) => [...entries, ...next]);
      if (next.length < LOG_BATCH) setLogEnded(true);
    } catch (reason) {
      setActionError(`\u5386\u53F2\u52A0\u8F7D\u5931\u8D25: ${reason instanceof Error ? reason.message : String(reason)}`);
    } finally {
      setLogLoadingMore(false);
    }
  };
  const openTab = (id, title, meta) => {
    betterSidebar.openTab({ type: "dsh-better-sidebar-svn:diff", id, title, meta }, scope);
  };
  const openWorktreeDiff = (entry) => {
    openTab(`svn-diff:w:${entry.path}`, baseName(entry.path), { kind: "worktree", path: entry.path });
  };
  const openCommitDiff = (entry) => {
    openTab(`svn-diff:c:${entry.revision}`, `r${entry.revision} ${firstLine(entry.message)}`, { kind: "commit", revision: entry.revision, subject: firstLine(entry.message) });
  };
  const runAction = async (action) => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await action();
      await refresh();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };
  const commit = async () => {
    const message = commitMsg.trim();
    if (message === "" || busy || committableEntries.length === 0) return;
    setBusy(true);
    setActionError(null);
    try {
      await svnApi.commit(scope, message);
      setCommitMsg("");
      await refresh();
    } catch (reason) {
      setActionError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusy(false);
    }
  };
  const runConfirmed = (confirmState) => {
    setConfirm({ ...confirmState, onConfirm: async () => {
      setBusy(true);
      setActionError(null);
      try {
        await confirmState.onConfirm();
        await refresh();
      } catch (reason) {
        setActionError(reason instanceof Error ? reason.message : String(reason));
      } finally {
        setBusy(false);
      }
    } });
  };
  const copy = (text) => {
    void (0, import_dsh_client_ui_primitives2.writeClipboard)(text);
  };
  const openFileMenu = (event, entry) => {
    event.preventDefault();
    event.stopPropagation();
    setFileMenu({ entry, x: event.clientX, y: event.clientY });
  };
  const openHistoryMenu = (event, entry) => {
    event.preventDefault();
    event.stopPropagation();
    setHistoryMenu({ entry, x: event.clientX, y: event.clientY });
  };
  const changedEntries = (status?.entries ?? []).filter((e) => e.status !== "normal");
  const committableEntries = changedEntries.filter(isVersionedChange);
  const renderEntry = (entry) => {
    const badge = STATUS_LABELS[entry.status] ?? entry.status;
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "svn-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
        "button",
        {
          type: "button",
          className: "svn-row-main",
          title: entry.path,
          onClick: () => {
            openWorktreeDiff(entry);
          },
          onContextMenu: (event) => {
            openFileMenu(event, entry);
          },
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: `svn-badge ${STATUS_CLASSES[entry.status] ?? ""}`, children: badge }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "svn-name", children: entry.path })
          ]
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: "svn-iconbtn",
          "aria-label": inlineLabel(entry),
          title: inlineLabel(entry),
          disabled: busy,
          onClick: () => {
            if (entry.status === "unversioned") void runAction(() => svnApi.add(scope, [entry.path]));
            else if (entry.status === "conflicted") void runAction(() => svnApi.resolve(scope, entry.path));
            else openWorktreeDiff(entry);
          },
          children: inlineIcon(entry)
        }
      )
    ] }, entry.path);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "svn-panel", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "svn-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "svn-branch", title: status?.relativeUrl ?? "", children: [
        status?.relativeUrl !== void 0 ? status.relativeUrl.replace("^/", "") : "",
        status?.revision !== void 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "svn-revision", children: ` r${status.revision}` }) : null
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "svn-header-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "svn-iconbtn",
            "aria-label": "\u66F4\u65B0",
            title: "\u66F4\u65B0 (svn update)",
            disabled: busy || status !== null && !status.isRepo,
            onClick: () => {
              void runAction(() => svnApi.update(scope));
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconDownloadOutline16, { size: 14 })
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "svn-iconbtn",
            "aria-label": "\u5237\u65B0",
            title: "\u5237\u65B0",
            onClick: () => {
              void refresh();
            },
            children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconRefreshOutline16, { size: 14 })
          }
        )
      ] })
    ] }),
    loading && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "svn-placeholder", children: "\u52A0\u8F7D\u4E2D..." }),
    !loading && error !== null && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "svn-error", children: error }),
    !loading && status !== null && !status.isRepo && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "svn-placeholder", children: "\u5F53\u524D\u76EE\u5F55\u4E0D\u662F SVN \u5DE5\u4F5C\u526F\u672C" }),
    status !== null && status.isRepo && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "svn-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "svn-section-header", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: `\u53D8\u66F4 (${changedEntries.length})` }) }),
        changedEntries.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "svn-empty", children: "\u65E0\u53D8\u66F4" }),
        changedEntries.map((entry) => renderEntry(entry))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "svn-commit", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          import_dsh_client_ui_primitives2.Input,
          {
            className: "svn-commit-input",
            placeholder: "\u63D0\u4EA4\u4FE1\u606F\uFF08Ctrl+Enter \u63D0\u4EA4\uFF09",
            value: commitMsg,
            disabled: busy,
            onChange: (event) => {
              setCommitMsg(event.target.value);
              setActionError(null);
            },
            onKeyDown: (event) => {
              if ((event.ctrlKey || event.metaKey) && event.key === "Enter") void commit();
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "svn-btn svn-btn-primary",
            disabled: busy || commitMsg.trim() === "" || committableEntries.length === 0,
            title: committableEntries.length === 0 ? "\u6CA1\u6709\u5DF2\u7248\u672C\u63A7\u5236\u7684\u53D8\u66F4\u53EF\u63D0\u4EA4" : void 0,
            onClick: () => {
              void commit();
            },
            children: "\u63D0\u4EA4"
          }
        )
      ] }),
      actionError !== null && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "svn-error", children: actionError }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "svn-section", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "svn-section-header", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "\u5386\u53F2" }) }),
        logEntries.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "div",
          {
            role: "button",
            tabIndex: 0,
            className: "svn-log-row",
            title: `${entry.author} \xB7 ${entry.date}
${entry.message}`,
            onClick: () => {
              openCommitDiff(entry);
            },
            onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openCommitDiff(entry);
              }
            },
            onContextMenu: (event) => {
              openHistoryMenu(event, entry);
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "svn-log-line1", children: [
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "svn-log-revision", children: `r${entry.revision}` }),
                /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "svn-log-message", children: firstLine(entry.message) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "svn-log-line2", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "svn-log-meta", children: [
                entry.author,
                " \xB7 ",
                relativeTime(entry.date)
              ] }) })
            ]
          },
          entry.revision
        )),
        !logEnded && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
          "button",
          {
            type: "button",
            className: "svn-log-more",
            disabled: logLoadingMore || busy,
            onClick: () => {
              void loadMoreLog();
            },
            children: logLoadingMore ? "\u52A0\u8F7D\u4E2D..." : "\u52A0\u8F7D\u66F4\u591A"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        import_dsh_client_ui_primitives2.Menu,
        {
          open: fileMenu !== null,
          onClose: () => {
            setFileMenu(null);
          },
          items: [
            { id: "open", label: "\u5728\u7F16\u8F91\u5668\u4E2D\u6253\u5F00", icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconCodeOutline16, { size: 14 }) },
            { id: "diff", label: "\u67E5\u770B\u53D8\u66F4" },
            ...fileMenu !== null && fileMenu.entry.status === "unversioned" ? [{ id: "add", label: "\u6DFB\u52A0\u5230\u7248\u672C\u63A7\u5236", icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconPlusOutline16, { size: 14 }) }] : [],
            ...fileMenu !== null && fileMenu.entry.status === "conflicted" ? [{ id: "resolve", label: "\u89E3\u51B3\u51B2\u7A81\uFF08\u4FDD\u7559\u5F53\u524D\uFF09", icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconCheckOutline16, { size: 14 }) }] : [],
            ...fileMenu !== null && isVersionedChange(fileMenu.entry) ? [{ id: "revert", label: "\u8FD8\u539F", icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconTrashOutline16, { size: 14 }), danger: true }] : [],
            { type: "separator", id: "sep1" },
            { id: "relative", label: "\u590D\u5236\u76F8\u5BF9\u8DEF\u5F84", icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconCopyOutline16, { size: 14 }) },
            { id: "absolute", label: "\u590D\u5236\u7EDD\u5BF9\u8DEF\u5F84", icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconCopyOutline16, { size: 14 }) }
          ],
          onSelect: (id) => {
            const target = fileMenu;
            if (target === null) return;
            setFileMenu(null);
            if (id === "open") {
              onOpenFile(target.entry.path);
              return;
            }
            if (id === "diff") {
              openWorktreeDiff(target.entry);
              return;
            }
            if (id === "add") {
              void runAction(() => svnApi.add(scope, [target.entry.path]));
              return;
            }
            if (id === "resolve") {
              void runAction(() => svnApi.resolve(scope, target.entry.path));
              return;
            }
            if (id === "revert") {
              runConfirmed({
                title: "\u8FD8\u539F",
                description: `\u786E\u5B9A\u8981\u8FD8\u539F "${target.entry.path}" \u7684\u672C\u5730\u4FEE\u6539\u5417\uFF1F\u6B64\u64CD\u4F5C\u4E0D\u53EF\u64A4\u9500\u3002`,
                confirmLabel: "\u8FD8\u539F",
                onConfirm: () => svnApi.revert(scope, [target.entry.path])
              });
              return;
            }
            if (id === "relative") {
              copy(target.entry.path);
              return;
            }
            if (id === "absolute") copy(absolutePath(scope.cwd, target.entry.path));
          },
          portal: true,
          align: "start",
          getAnchorRect: () => fileMenu === null ? null : new DOMRect(fileMenu.x, fileMenu.y, 0, 0),
          anchor: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", {})
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        import_dsh_client_ui_primitives2.Menu,
        {
          open: historyMenu !== null,
          onClose: () => {
            setHistoryMenu(null);
          },
          items: [
            { id: "view", label: "\u67E5\u770B\u63D0\u4EA4\u53D8\u66F4" },
            { id: "copyRev", label: "\u590D\u5236\u7248\u672C\u53F7", icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconCopyOutline16, { size: 14 }) },
            { id: "copyMsg", label: "\u590D\u5236\u63D0\u4EA4\u4FE1\u606F", icon: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconCopyOutline16, { size: 14 }) },
            { type: "separator", id: "sep2" },
            { id: "rollback", label: "\u8FD8\u539F\u6B64\u63D0\u4EA4", danger: true }
          ],
          onSelect: (id) => {
            const target = historyMenu;
            if (target === null) return;
            setHistoryMenu(null);
            if (id === "view") {
              openCommitDiff(target.entry);
              return;
            }
            if (id === "copyRev") {
              copy(target.entry.revision);
              return;
            }
            if (id === "copyMsg") {
              copy(target.entry.message);
              return;
            }
            if (id === "rollback") {
              runConfirmed({
                title: "\u8FD8\u539F\u6B64\u63D0\u4EA4",
                description: `\u786E\u5B9A\u8981\u8FD8\u539F r${target.entry.revision} "${firstLine(target.entry.message)}" \u5417\uFF1F\u64A4\u9500\u7684\u6539\u52A8\u4F1A\u843D\u56DE\u5DE5\u4F5C\u526F\u672C\uFF0C\u786E\u8BA4\u540E\u8FD8\u9700\u63D0\u4EA4\u3002`,
                confirmLabel: "\u8FD8\u539F",
                onConfirm: () => svnApi.revertRevision(scope, target.entry.revision)
              });
            }
          },
          portal: true,
          align: "start",
          getAnchorRect: () => historyMenu === null ? null : new DOMRect(historyMenu.x, historyMenu.y, 0, 0),
          anchor: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", {})
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        import_dsh_client_ui_primitives2.Modal,
        {
          open: confirm !== null,
          onClose: () => {
            setConfirm(null);
          },
          title: confirm?.title ?? "",
          closeLabel: "\u53D6\u6D88",
          footer: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_jsx_runtime2.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.Button, { variant: "outline", onClick: () => {
              setConfirm(null);
            }, children: "\u53D6\u6D88" }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
              import_dsh_client_ui_primitives2.Button,
              {
                variant: "primary",
                disabled: busy,
                onClick: () => {
                  const pending = confirm;
                  if (pending === null) return;
                  setConfirm(null);
                  void pending.onConfirm();
                },
                children: confirm?.confirmLabel ?? ""
              }
            )
          ] }),
          children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "svn-confirm-desc", children: confirm?.description })
        }
      )
    ] })
  ] });
}
function firstLine(message) {
  const index = message.indexOf("\n");
  return (index === -1 ? message : message.slice(0, index)).trim();
}
function inlineLabel(entry) {
  if (entry.status === "unversioned") return "\u6DFB\u52A0\u5230\u7248\u672C\u63A7\u5236";
  if (entry.status === "conflicted") return "\u89E3\u51B3\u51B2\u7A81\uFF08\u4FDD\u7559\u5F53\u524D\uFF09";
  return "\u67E5\u770B\u53D8\u66F4";
}
function inlineIcon(entry) {
  if (entry.status === "unversioned") return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconPlusOutline16, {});
  if (entry.status === "conflicted") return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconCheckOutline16, {});
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_dsh_client_ui_primitives2.IconCodeOutline16, {});
}

// src/client/svn.css
var svn_default = "/**\n * SVN \u9762\u677F\u6837\u5F0F\uFF1A\u4E0E better-sidebar \u7684 GitView \u89C6\u89C9\u98CE\u683C\u4FDD\u6301\u4E00\u81F4\u3002\n * \u5168\u90E8\u989C\u8272\u4F7F\u7528 dsw \u8BBE\u8BA1\u4EE4\u724C\uFF08--dsw-alias-* / --dsw-font-*\uFF09\uFF0C\u81EA\u52A8\u9002\u914D\u4EAE/\u6697\u4E3B\u9898\u3002\n * \u4F7F\u7528 svn- \u524D\u7F00\u907F\u514D\u4E0E\u5185\u7F6E\u6837\u5F0F\u51B2\u7A81\u3002\n */\n\n.svn-panel {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n  min-width: 0;\n  min-height: 0;\n  overflow: hidden auto;\n  font: var(--dsw-font-xxs-12);\n  color: var(--dsw-alias-label-primary);\n  background: var(--dsw-alias-bg-base);\n}\n\n.svn-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  flex: none;\n  height: 36px;\n  padding: 0 8px 0 12px;\n}\n\n.svn-branch {\n  font: var(--dsw-font-s-14);\n  color: var(--dsw-alias-label-secondary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  min-width: 0;\n}\n\n.svn-revision {\n  font: var(--dsw-font-xxs-12);\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.svn-header-actions {\n  display: flex;\n  align-items: center;\n  gap: 2px;\n  flex: none;\n}\n\n.svn-iconbtn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 28px;\n  height: 28px;\n  color: var(--dsw-alias-label-secondary);\n  background: none;\n  border: none;\n  border-radius: 50%;\n  cursor: pointer;\n  flex: none;\n  padding: 0;\n}\n\n.svn-iconbtn:hover:not(:disabled) {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.svn-iconbtn:disabled {\n  opacity: 0.4;\n  cursor: default;\n}\n\n.svn-btn {\n  padding: 3px 12px;\n  font: var(--dsw-font-xxs-strong-12);\n  border: none;\n  border-radius: 6px;\n  cursor: pointer;\n  line-height: 1.5;\n}\n\n.svn-btn:disabled {\n  opacity: 0.45;\n  cursor: default;\n}\n\n.svn-btn-primary {\n  background: var(--dsw-alias-button-primary-fill);\n  color: var(--dsw-alias-label-primary-inverted);\n}\n\n.svn-btn-primary:hover:not(:disabled) {\n  background: var(--dsw-alias-button-primary-hover);\n}\n\n.svn-placeholder {\n  padding: 16px;\n  text-align: center;\n  font: var(--dsw-font-xxs-12);\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.svn-error {\n  padding: 8px 12px;\n  font: var(--dsw-font-xxs-12);\n  color: var(--dsw-alias-state-error-primary);\n  white-space: pre-wrap;\n  word-break: break-word;\n}\n\n.svn-section {\n  border-top: 1px solid var(--dsw-alias-border-l1);\n}\n\n.svn-section-header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 6px 12px 4px;\n  font: var(--dsw-font-xxxs-strong-11);\n  text-transform: uppercase;\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.svn-empty {\n  padding: 4px 12px 8px;\n  font: var(--dsw-font-xxs-12);\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.svn-row {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  min-height: 34px;\n  margin: 0 6px;\n  padding: 0 8px;\n  border-radius: 8px;\n}\n\n.svn-row:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.svn-row-main {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  min-width: 0;\n  flex: 1;\n  cursor: pointer;\n  text-align: left;\n  background: none;\n  border: none;\n  padding: 3px 0;\n  color: inherit;\n  font: inherit;\n}\n\n.svn-badge {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  width: 20px;\n  height: 16px;\n  font: var(--dsw-font-xxxs-strong-11);\n  border-radius: 4px;\n  flex: none;\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-secondary);\n}\n\n.svn-status-modified {\n  color: var(--dsw-alias-state-warn-primary);\n}\n\n.svn-status-added {\n  color: var(--dsw-alias-state-success-primary);\n}\n\n.svn-status-deleted {\n  color: var(--dsw-alias-state-error-primary);\n}\n\n.svn-status-conflicted {\n  color: var(--dsw-alias-state-error-primary);\n  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 25%, transparent);\n}\n\n.svn-status-replaced {\n  color: var(--dsw-alias-brand-primary);\n}\n\n.svn-status-unversioned {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.svn-status-missing {\n  color: var(--dsw-alias-state-error-primary);\n}\n\n.svn-name {\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  font: var(--dsw-font-s-14);\n  color: var(--dsw-alias-label-primary);\n}\n\n.svn-commit {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  padding: 8px 12px;\n  border-top: 1px solid var(--dsw-alias-border-l1);\n}\n\n.svn-commit-input {\n  flex: 1;\n  min-width: 0;\n}\n\n.svn-log-row {\n  display: flex;\n  flex-direction: column;\n  gap: 2px;\n  padding: 5px 12px;\n  cursor: pointer;\n  border-radius: 8px;\n  margin: 0 6px;\n}\n\n.svn-log-row:hover {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n\n.svn-log-line1 {\n  display: flex;\n  align-items: baseline;\n  gap: 8px;\n  min-width: 0;\n}\n\n.svn-log-revision {\n  font: var(--dsw-font-markdown-code-block-small);\n  color: var(--dsw-alias-label-tertiary);\n  flex: none;\n}\n\n.svn-log-message {\n  font: var(--dsw-font-s-14);\n  color: var(--dsw-alias-label-primary);\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.svn-log-line2 {\n  display: flex;\n  flex-wrap: wrap;\n  align-items: center;\n  gap: 6px;\n  min-width: 0;\n}\n\n.svn-log-meta {\n  font: var(--dsw-font-xxxs-11);\n  color: var(--dsw-alias-label-tertiary);\n}\n\n.svn-log-more {\n  display: block;\n  width: calc(100% - 24px);\n  margin: 4px 12px 8px;\n  padding: 6px 0;\n  font: var(--dsw-font-xxs-12);\n  color: var(--dsw-alias-label-secondary);\n  background: none;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 6px;\n  cursor: pointer;\n  text-align: center;\n}\n\n.svn-log-more:hover:not(:disabled) {\n  background: var(--dsw-alias-interactive-bg-hover);\n  color: var(--dsw-alias-label-primary);\n}\n\n.svn-log-more:disabled {\n  opacity: 0.5;\n  cursor: default;\n}\n\n.svn-confirm-desc {\n  margin: 0;\n  font: var(--dsw-font-s-14);\n  color: var(--dsw-alias-label-primary);\n  white-space: pre-wrap;\n}\n\n/* \u2500\u2500 \u72EC\u7ACB diff \u6807\u7B7E\u9875 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */\n\n.svn-difftab {\n  display: flex;\n  flex-direction: column;\n  flex: 1;\n  min-width: 0;\n  min-height: 0;\n  overflow: hidden auto;\n  font: var(--dsw-font-markdown-code-block-small);\n  background: var(--dsw-alias-bg-base);\n}\n\n.svn-difftab-header {\n  display: flex;\n  align-items: center;\n  gap: 8px;\n  flex: none;\n  height: 36px;\n  padding: 0 8px 0 12px;\n  border-bottom: 1px solid var(--dsw-alias-border-l1);\n}\n\n.svn-difftab-title {\n  font: var(--dsw-font-xxs-strong-12);\n  color: var(--dsw-alias-label-primary);\n  flex: 1;\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.svn-diff-file {\n  padding: 8px 2px 2px;\n}\n\n.svn-diff-fileheader {\n  display: flex;\n  align-items: baseline;\n  gap: 6px;\n  padding: 8px 2px 2px;\n}\n\n.svn-diff-filepath {\n  font: var(--dsw-font-xxs-strong-12);\n  color: var(--dsw-alias-label-primary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n\n.svn-diff-fileold {\n  font: var(--dsw-font-xxxs-11);\n  color: var(--dsw-alias-label-tertiary);\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n  flex: none;\n  max-width: 40%;\n}\n\n.svn-diff-hunk {\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  padding: 3px 2px;\n}\n\n.svn-diff-line {\n  display: flex;\n  align-items: stretch;\n  min-width: 0;\n  line-height: 20px;\n}\n\n.svn-diff-num {\n  width: 36px;\n  flex: none;\n  text-align: right;\n  padding-right: 8px;\n  color: var(--dsw-alias-label-tertiary);\n  user-select: none;\n}\n\n.svn-diff-code {\n  flex: 1;\n  min-width: 0;\n  overflow: visible;\n  white-space: pre-wrap;\n  overflow-wrap: anywhere;\n}\n\n.svn-diff-ctx {\n  color: var(--dsw-alias-label-primary);\n}\n\n.svn-diff-del {\n  color: var(--dsw-alias-state-error-primary);\n  background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 12%, transparent);\n}\n\n.svn-diff-add {\n  color: var(--dsw-alias-state-success-primary);\n  background: color-mix(in srgb, var(--dsw-alias-state-success-primary) 12%, transparent);\n}\n\n.svn-diff-meta {\n  color: var(--dsw-alias-label-tertiary);\n}\n\n/* \u7126\u70B9\u53EF\u89C1\u6027 */\n.svn-iconbtn:focus-visible,\n.svn-btn:focus-visible,\n.svn-row-main:focus-visible,\n.svn-log-row:focus-visible,\n.svn-log-more:focus-visible,\n.svn-commit-input:focus-visible {\n  outline: 2px solid var(--dsw-alias-interactive-bg-hover-accent);\n  outline-offset: -1px;\n}\n";

// src/client/index.tsx
var IconDiffOutline16 = ({ size = 16 }) => (0, import_react3.createElement)(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg"
  },
  (0, import_react3.createElement)("rect", { x: 1.5, y: 1.5, width: 13, height: 13, rx: 2.5, stroke: "currentColor", strokeWidth: 1.5 }),
  (0, import_react3.createElement)("path", { d: "M4 5h3M5.5 3.5v3", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" }),
  (0, import_react3.createElement)("path", { d: "M9.5 12.5h2.5", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" })
);
var style = typeof document === "undefined" ? void 0 : document.createElement("style");
if (style !== void 0) {
  style.textContent = svn_default;
  document.head.appendChild(style);
}
var inject = ["betterSidebar"];
var DIFF_TAB_TYPE = "dsh-better-sidebar-svn:diff";
function apply(ctx) {
  ctx.effect(() => {
    const disposeMain = ctx.betterSidebar.registerTab({
      id: "svn",
      title: "\u6E90\u4EE3\u7801\u7BA1\u7406SVN",
      icon: (size) => (0, import_react3.createElement)(import_dsh_client_ui_primitives3.IconBranchOutline16, { size }),
      order: 25,
      // 排在 git (20) 后面、subagent (30) 前面
      single: true,
      // 单实例
      component: (props) => (0, import_react3.createElement)(SvnView, {
        scope: props.scope,
        betterSidebar: ctx.betterSidebar,
        onOpenFile: props.onOpenFile ?? (() => {
        })
      })
    });
    const disposeDiff = ctx.betterSidebar.registerTab({
      id: DIFF_TAB_TYPE,
      // 与内置 Git 的 diff 标签页同一惯例：标题沿用主面板名，图标用 diff 图形
      title: "\u6E90\u4EE3\u7801\u7BA1\u7406SVN",
      icon: (size) => (0, import_react3.createElement)(IconDiffOutline16, { size }),
      hidden: true,
      dedupeKey: (tab) => tab.id,
      component: (props) => (0, import_react3.createElement)(SvnDiffTab, {
        scope: props.scope,
        meta: props.tab.meta ?? {}
      })
    });
    return () => {
      disposeDiff();
      disposeMain();
    };
  }, "dsh-better-sidebar-svn: register SVN tabs");
}
		return module.exports;
	}
});
//# sourceMappingURL=client.js.map
