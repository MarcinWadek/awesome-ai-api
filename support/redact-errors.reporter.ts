import type { Reporter, TestCase, TestError, TestResult, TestStep } from '@playwright/test/reporter';

function redact(error: TestError | undefined, requestStep = false): void {
  if (!error) return;
  if (requestStep || error.message?.includes('Call log:')) {
    // Mutate the shared error before subsequent reporters serialize it.
    error.message = 'Request failed; sensitive request details omitted';
    delete error.stack;
    delete error.snippet;
    delete error.value;
    delete error.cause;
  } else {
    redact(error.cause);
  }
}

export default class RedactErrorsReporter implements Reporter {
  printsToStdio(): boolean {
    return false;
  }

  onStepEnd(_test: TestCase, _result: TestResult, step: TestStep): void {
    redact(step.error, step.category === 'pw:api');
  }

  onTestEnd(_test: TestCase, result: TestResult): void {
    for (const error of result.errors) redact(error);
  }
}
