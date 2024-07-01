import { type Storage } from './Storage';
type StorageObject = {
    [k: string]: string;
};

const STORAGE_KEY = "CONNECTION_STORAGE_KEY";

export class LocalStorage implements Storage {
    async #readObject(): Promise<StorageObject> {
        try {
            const returnVal = JSON.parse(localStorage.getItem(STORAGE_KEY) as string);
            if (returnVal == null) {
                return {};
            }
            return returnVal;
        } catch (e) {
            return {};
        }
    }

    async #writeObject(obj: StorageObject):Promise<void> {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    }

    async _setItem(key: string, value: string) {
        const obj = await this.#readObject();
        obj[key] = value;
        await this.#writeObject(obj);
    }

    async _getItem(key: string): Promise<string | null> {
        const obj = await this.#readObject();
        return obj[key] ?? null;
    }

    async _removeItem(key: string): Promise<void> {
        const obj = await this.#readObject();
        delete obj[key];
        await this.#writeObject(obj);
    }
}