async function processIncludes(root = document) {
  const targets = root.querySelectorAll("[data-include-path]");

  for (const hostEl of targets) {
    const path = hostEl.dataset.includePath;
    if (!path) continue;

    const res = await fetch(path, { cache: "no-cache" });
    if (!res.ok) continue;

    let html = await res.text();

    // 1️⃣ text props
    Object.keys(hostEl.dataset).forEach((key) => {
      if (!key.startsWith("prop")) return;
      const name = key.slice(4);
      const prop = name.charAt(0).toLowerCase() + name.slice(1);
      html = html.replace(
        new RegExp(`\\{\\s*${prop}\\s*\\}`, "g"),
        hostEl.dataset[key]
      );
    });

    // 2️⃣ class props
    Object.keys(hostEl.dataset).forEach((key) => {
      if (!key.startsWith("class")) return;
      const name = key.slice(5);
      const classKey = name.charAt(0).toLowerCase() + name.slice(1);
      html = html.replace(
        new RegExp(`\\{\\s*${classKey}Class\\s*\\}`, "g"),
        hostEl.dataset[key]
      );
    });

    html = html.replace(/\{\s*\w+Class\s*\}/g, "");
    // 전달되지 않은 prop 자리표시자는 빈 값으로 제거
    html = html.replace(/\{\s*[A-Za-z][\w]*\s*\}/g, "");

    // 3️⃣ HTML → DOM 변환
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const insertedNodes = Array.from(temp.childNodes);

    // 4️⃣ 실제 DOM 교체
    hostEl.replaceWith(...insertedNodes);

    // 5️⃣ 🔁 삽입된 노드 기준으로 재귀 처리
    for (const node of insertedNodes) {
      if (node.nodeType === 1) {
        await processIncludes(node);
      }
    }
  }
}

window.addEventListener("DOMContentLoaded", () => {
  processIncludes();
});
