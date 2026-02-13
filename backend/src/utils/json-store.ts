import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ZodType } from "zod";

export class JsonStore<T> {
  constructor(
    private readonly filePath: string,
    private readonly schema: ZodType<T>
  ) {}

  async read(): Promise<T> {
    try {
      const data = await readFile(this.filePath, "utf8");
      return this.schema.parse(JSON.parse(data));
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        const fallback = this.schema.parse([]);
        await this.write(fallback);
        return fallback;
      }

      throw error;
    }
  }

  async write(payload: T): Promise<void> {
    const validated = this.schema.parse(payload);
    const dir = path.dirname(this.filePath);
    await mkdir(dir, { recursive: true });
    const tmp = `${this.filePath}.tmp`;

    await writeFile(tmp, JSON.stringify(validated, null, 2), "utf8");
    await rename(tmp, this.filePath);
  }
}
