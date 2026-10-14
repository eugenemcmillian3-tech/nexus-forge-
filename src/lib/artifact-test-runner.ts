import type { BrowserCase } from '../../convex/artifactTestPlan'

// This script runs only in an opaque-origin, scripts-only iframe. It never evaluates test code.
const harness = String.raw`
const send = window.parent.postMessage.bind(window.parent);
const schedule = window.setTimeout.bind(window);
const query = Document.prototype.querySelector;
const text = Object.getOwnPropertyDescriptor(Node.prototype, "textContent").get;
const click = HTMLElement.prototype.click;
const dispatch = EventTarget.prototype.dispatchEvent;
const NativeEvent = Event;
const inputSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
const textareaSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
const selectSetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set;
const inputGetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").get;
const textareaGetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").get;
const selectGetter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").get;
const inputValid = HTMLInputElement.prototype.checkValidity;
const textareaValid = HTMLTextAreaElement.prototype.checkValidity;
const selectValid = HTMLSelectElement.prototype.checkValidity;
const formValid = HTMLFormElement.prototype.checkValidity;
const style = window.getComputedStyle.bind(window);
const rect = Element.prototype.getBoundingClientRect;
const current = document.currentScript;
if (current) current.remove();
const wait = () => new Promise(resolve => schedule(resolve, 60));
let started = false;
window.addEventListener("load", async function () {
  if (started) return;
  started = true;
  const results = [];
  for (const test of plan) {
    const steps = [];
    let failed = false;
    for (const step of test.steps) {
      if (failed) { steps.push({ status: "not_run", detail: "A prior step failed." }); continue; }
      try {
        await wait();
        const element = query.call(document, step.selector);
        if (!element) throw new Error("No element matches " + step.selector);
        let detail = "";
        if (step.action === "fill") {
          const setter = element.tagName === "INPUT" ? inputSetter : element.tagName === "TEXTAREA" ? textareaSetter : element.tagName === "SELECT" ? selectSetter : null;
          if (!setter) throw new Error("Fill requires an input, textarea, or select.");
          setter.call(element, step.value);
          dispatch.call(element, new NativeEvent("input", { bubbles: true }));
          dispatch.call(element, new NativeEvent("change", { bubbles: true }));
          detail = "Filled " + step.selector;
        } else if (step.action === "click") {
          click.call(element);
          detail = "Clicked " + step.selector;
        } else if (step.action === "assertText") {
          const observed = String(text.call(element) || "");
          if (!observed.includes(step.value)) throw new Error("Expected text " + step.value.slice(0, 200) + "; observed " + observed.slice(0, 300));
          detail = "Observed expected text: " + step.value.slice(0, 300);
        } else if (step.action === "assertValue") {
          const getter = element.tagName === "INPUT" ? inputGetter : element.tagName === "TEXTAREA" ? textareaGetter : element.tagName === "SELECT" ? selectGetter : null;
          if (!getter) throw new Error("Value assertion requires a form field.");
          const observed = getter.call(element);
          if (observed !== step.value) throw new Error("Expected value " + step.value.slice(0, 200) + "; observed " + String(observed).slice(0, 300));
          detail = "Observed expected field value: " + step.value.slice(0, 300);
        } else if (step.action === "assertVisible") {
          const computed = style(element), bounds = rect.call(element);
          if (computed.display === "none" || computed.visibility === "hidden" || bounds.width <= 0 || bounds.height <= 0) throw new Error("Element is not visibly rendered.");
          detail = "Element has visible layout bounds.";
        } else if (step.action === "assertInvalid") {
          const check = element.tagName === "FORM" ? formValid : element.tagName === "INPUT" ? inputValid : element.tagName === "TEXTAREA" ? textareaValid : element.tagName === "SELECT" ? selectValid : null;
          if (!check) throw new Error("Validity assertion requires a form or field.");
          if (check.call(element)) throw new Error("Expected invalid input; browser validation accepted it.");
          detail = "Browser validity check rejected the input.";
        } else throw new Error("Unsupported step action.");
        steps.push({ status: "pass", detail: detail.slice(0, 1000) });
      } catch (error) {
        failed = true;
        steps.push({ status: "fail", detail: String(error && error.message || error).slice(0, 1000) });
      }
    }
    results.push(steps);
  }
  send({ type: "nexus-artifact-tests", nonce, results }, "*");
}, { once: true });
`

export function buildArtifactTestDocument(content: string, plan: BrowserCase[], nonce: string) {
  const json = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c')
  const policy = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src 'none'; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'"
  return '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="' + policy + '"><script>(()=>{const nonce=' + json(nonce) + ';const plan=' + json(plan) + ';' + harness + '})();</script></head><body>' + content + '</body></html>'
}
