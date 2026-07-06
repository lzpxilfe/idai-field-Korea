const STORAGE_KEY = "bridgedesk-field-draft-v1";

const entriesEl = document.querySelector("#entries");
const template = document.querySelector("#entryTemplate");
const statusEl = document.querySelector("#syncStatus");

const fields = {
  projectName: document.querySelector("#projectName"),
  siteName: document.querySelector("#siteName"),
  inspector: document.querySelector("#inspector"),
  weather: document.querySelector("#weather"),
  address: document.querySelector("#address"),
};

document.querySelector("#addEntryButton").addEventListener("click", () => {
  addEntry();
  renumberEntries();
  saveDraft("항목 추가됨");
});

document.querySelector("#saveButton").addEventListener("click", () => saveDraft("임시저장 완료"));
document.querySelector("#resetButton").addEventListener("click", resetDraft);
document.querySelector("#exportButton").addEventListener("click", exportJson);

Object.values(fields).forEach((field) => {
  field.addEventListener("input", () => saveDraft("작성 중"));
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}

loadDraft();

function addEntry(values = {}) {
  const node = template.content.firstElementChild.cloneNode(true);
  node.querySelector(".remove-entry").addEventListener("click", () => {
    node.remove();
    renumberEntries();
    saveDraft("항목 삭제됨");
  });
  node.querySelectorAll("[data-field]").forEach((input) => {
    const field = input.dataset.field;
    if (field in values) {
      input.value = Array.isArray(values[field]) ? values[field].join(", ") : values[field];
    }
    input.addEventListener("input", () => saveDraft("작성 중"));
  });
  entriesEl.appendChild(node);
}

function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    addEntry();
    renumberEntries();
    return;
  }

  try {
    const draft = JSON.parse(raw);
    fields.projectName.value = draft.project_name || fields.projectName.value;
    fields.siteName.value = draft.site_name || fields.siteName.value;
    fields.inspector.value = draft.inspector || fields.inspector.value;
    fields.weather.value = draft.weather || fields.weather.value;
    fields.address.value = draft.location?.address || fields.address.value;
    const entries = Array.isArray(draft.entries) && draft.entries.length ? draft.entries : [{}];
    entries.forEach((entry) => addEntry(entry));
    renumberEntries();
    setStatus("임시저장 불러옴");
  } catch {
    addEntry();
    renumberEntries();
    setStatus("새 조사");
  }
}

function saveDraft(message) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(collectSubmission()));
  setStatus(message);
}

function resetDraft() {
  if (!confirm("현재 입력을 비우고 새 조사 기록을 시작할까요?")) {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  entriesEl.innerHTML = "";
  addEntry({});
  renumberEntries();
  setStatus("새 조사");
}

function exportJson() {
  const submission = collectSubmission();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(submission));
  const json = JSON.stringify([submission], null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${submission.submission_id}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setStatus("JSON 내보냄");
}

function collectSubmission() {
  const now = new Date();
  return {
    submission_id: buildSubmissionId(now),
    project_name: fields.projectName.value.trim(),
    site_name: fields.siteName.value.trim(),
    submitted_at: now.toISOString(),
    inspector: fields.inspector.value.trim(),
    device_id: getDeviceId(),
    weather: fields.weather.value.trim(),
    location: {
      address: fields.address.value.trim(),
      lat: null,
      lon: null,
    },
    entries: collectEntries(),
  };
}

function collectEntries() {
  return [...entriesEl.querySelectorAll(".entry")].map((entry, index) => {
    const values = {};
    entry.querySelectorAll("[data-field]").forEach((input) => {
      values[input.dataset.field] = input.value.trim();
    });
    return {
      entry_id: `E-${String(index + 1).padStart(3, "0")}`,
      section: values.section,
      item: values.item,
      status: values.status,
      measured_value: values.measured_value,
      memo: values.memo,
      recommendation: values.recommendation,
      photo_ids: values.photo_ids
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    };
  });
}

function renumberEntries() {
  entriesEl.querySelectorAll(".entry-number").forEach((label, index) => {
    label.textContent = `항목 ${index + 1}`;
  });
}

function buildSubmissionId(date) {
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `FIELD-${stamp}`;
}

function getDeviceId() {
  let deviceId = localStorage.getItem("bridgedesk-device-id");
  if (!deviceId) {
    deviceId = `TABLET-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    localStorage.setItem("bridgedesk-device-id", deviceId);
  }
  return deviceId;
}

function setStatus(message) {
  statusEl.textContent = message;
}
