const STORAGE_EVENT_NAME = "kfp-storage-update" as const;

type StorageEventDetail = {
  key: string;
};

const isBrowser = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const clone = <T>(value: T): T => {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

export const STORAGE_KEYS = {
  agencies: "kfp.agencies",
  branches: "kfp.branches",
  checkpoints: "kfp.checkpoints",
  guards: "kfp.guards",
} as const;

export function readCollection<T>(key: string, fallback: T[]): T[] {
  if (!isBrowser()) {
    return clone(fallback);
  }

  const storedValue = window.localStorage.getItem(key);
  if (!storedValue) {
    const data = clone(fallback);
    window.localStorage.setItem(key, JSON.stringify(data));
    return data;
  }

  try {
    const parsed = JSON.parse(storedValue);
    if (Array.isArray(parsed)) {
      return parsed as T[];
    }
    throw new Error("Stored value is not an array");
  } catch (error) {
    console.warn(`Failed to parse localStorage key "${key}":`, error);
    const data = clone(fallback);
    window.localStorage.setItem(key, JSON.stringify(data));
    return data;
  }
}

export function writeCollection<T>(key: string, value: T[]): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
  const event = new CustomEvent<StorageEventDetail>(STORAGE_EVENT_NAME, {
    detail: { key },
  });
  window.dispatchEvent(event);
}

export function subscribeToStorage(
  key: string,
  callback: () => void
): () => void {
  if (!isBrowser()) {
    return () => undefined;
  }

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<StorageEventDetail>;
    if (customEvent.detail?.key === key) {
      callback();
    }
  };

  const handleNativeStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      callback();
    }
  };

  window.addEventListener(STORAGE_EVENT_NAME, handleCustomEvent as EventListener);
  window.addEventListener("storage", handleNativeStorage);

  return () => {
    window.removeEventListener(
      STORAGE_EVENT_NAME,
      handleCustomEvent as EventListener
    );
    window.removeEventListener("storage", handleNativeStorage);
  };
}

export { STORAGE_EVENT_NAME };
