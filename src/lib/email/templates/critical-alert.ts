export function renderCriticalAlertEmail(input: {
  title: string;
  body: string;
  appName?: string;
}) {
  const appName = input.appName || "Personal Finance";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5">
      <h2>${appName} - Critical alert</h2>
      <p><strong>${input.title}</strong></p>
      <p>${input.body}</p>
    </div>
  `;
  const text = `${appName} - Critical alert\n\n${input.title}\n${input.body}`;
  return { html, text };
}
