import { SetStateAction, useCallback, useEffect, useState } from "react";
import {
  readCollection,
  subscribeToStorage,
  writeCollection,
} from "../utils/storage";

export function usePersistentCollection<T>(
  key: string,
  initialValue: T[]
) {
  const [data, setDataState] = useState<T[]>(() =>
    readCollection<T>(key, initialValue)
  );

  useEffect(() => {
    const unsubscribe = subscribeToStorage(key, () => {
      setDataState(readCollection<T>(key, initialValue));
    });

    return () => {
      unsubscribe();
    };
  }, [initialValue, key]);

  const setData = useCallback(
    (updater: SetStateAction<T[]>) => {
      setDataState((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (value: T[]) => T[])(prev)
            : updater;

        if (Object.is(prev, next)) {
          return prev;
        }

        writeCollection<T>(key, next);
        return next;
      });
    },
    [key]
  );

  return [data, setData] as const;
}
