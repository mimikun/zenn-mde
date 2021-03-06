import * as React from "react";
import { render } from "react-dom";
import "zenn-content-css";
import {
  loadScript,
  loadStylesheet,
} from "zenn-init-embed/lib/utils/load-external-source";
import pEvent from "p-event";
// eslint-disable-next-line import/no-unresolved
import Worker from "worker-loader!./worker";
import { useProvider } from "../src/hooks";
import "../css/editor.css";
import { Editor, defaultCommands, EnterKey } from "../src";
import markdown from "./markdown.txt";

declare global {
  interface Window {
    twttr: any;
  }
}

loadStylesheet({
  id: "katex-css",
  href: "https://cdn.jsdelivr.net/npm/katex@0.11.1/dist/katex.min.css",
});

const Main = () => {
  const [emit, Provider] = useProvider();
  const [value, setValue] = React.useState(markdown);
  const worker = React.useMemo(() => {
    const w = new Worker();
    return w;
  }, []);
  const handleValueChange = React.useCallback((newValue: string) => {
    setValue(newValue);
  }, []);
  const handleYouTubeClick = React.useCallback(() => {
    emit({
      type: "insert",
      text: "@[youtube](ApXoWvfEYVU)",
    });
  }, []);
  const handleTwitterClick = React.useCallback(() => {
    emit({
      type: "insert",
      text:
        "@[tweet](https://twitter.com/catnose99/status/1309382877272879110)",
    });
  }, []);
  const handleImageUpload = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const uploadingMsg = "![](now uploading...)";
      emit({
        type: "insert",
        text: uploadingMsg,
      });
      await new Promise((resolve) => {
        setTimeout(() => resolve(), 1000);
      });
      emit({
        type: "replace",
        targetText: uploadingMsg,
        text: "![](https://source.unsplash.com/1600x900/?nature,water)",
      });
    },
    []
  );

  const handleMarkdown = async (str: string) => {
    worker.postMessage(str);
    const e = await pEvent(worker, "message");
    return e.data;
  };

  const handleClear = () => {
    emit({ type: "clear" });
  };

  const handleFocus = () => {
    emit({ type: "focus", last: true });
  };

  // const handleMarkdown = async (str: string) => {
  //   return markdownToHtml(str);
  // };

  return (
    <Provider>
      <div className="tool">
        <button type="button" onClick={handleYouTubeClick}>
          YouTube挿入
        </button>
        <button type="button" onClick={handleTwitterClick}>
          Twitter挿入
        </button>
        <input type="file" onChange={handleImageUpload} />
        <button type="button" onClick={handleClear}>clear</button>
        <button type="button" onClick={handleFocus}>focus</button>
      </div>
      <div className="demo">
        <Editor
          previewClassName="znc"
          previewCallback={{
            onBeforeNodeDiscarded(node: any) {
              if (
                node.closest &&
                !node.classList.contains("embed-tweet") &&
                node.closest(".embed-tweet")
              ) {
                const id = node.getAttribute("id") ?? "";
                if (
                  (node.tagName === "IFRAME" && id.indexOf("twitter") >= 0) ||
                  node.classList.contains("twitter-tweet")
                ) {
                  return false;
                }
              }
              return true;
            },
            onNodeAdded(node: any) {
              if (node.classList && node.classList.contains("embed-tweet")) {
                window.twttr.widgets.load();
                const znc = node.closest(".znc");
                if (znc) {
                  const extraTweets = znc.querySelectorAll(
                    ".twitter-tweet + .twitter-tweet"
                  );
                  extraTweets.forEach((tweet) => tweet.remove());
                }
                // });
              }
            },
          }}
          value={value}
          onChange={handleValueChange}
          parser={handleMarkdown}
          commands={{ 
            ...defaultCommands,
            save: (textarea, option) => {
              const { composing, code, shiftKey, metaKey, ctrlKey } = option;
              if ((metaKey || ctrlKey) && !shiftKey) {
                // + Enterで送信
                if (!composing && code === EnterKey) {
                  alert('command test')
                  return { stop: true, change: false };
                }
              }
            },
          }}
        />
      </div>
    </Provider>
  );
};

loadScript({
  src: "https://platform.twitter.com/widgets.js",
  id: "embed-tweet",
  refreshIfExist: true,
}).then(() => {
  render(<Main />, document.getElementById("main"));
});
