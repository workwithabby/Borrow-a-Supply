import { loadingBlock, $ } from './ui.js';
import { errorState } from './empty-state.js';

// Loads data into `body`, shows a spinner, then the content, or an error with a Try again button.
// render(data, body) draws the content and wires its buttons.
export async function loadInto(body, fetcher, render) {
  const run = async () => {
    body.innerHTML = loadingBlock();
    const { data, error } = await fetcher();
    if (error) {
      body.innerHTML = errorState(error.message);
      $('#retry', body)?.addEventListener('click', run);
      return;
    }
    body.innerHTML = '';
    await render(data, body, run);
  };
  return run();
}

// Runs several service calls together. Gives back the first error, or all the data in order.
export async function loadAll(...calls) {
  const results = await Promise.all(calls);
  const failed = results.find((r) => r.error);
  return failed ? { data: null, error: failed.error } : { data: results.map((r) => r.data), error: null };
}
