export default class AppError extends Error {
    constructor(msg, options) {
        super(msg, { cause: options?.cause });

        this.code = options?.code ?? 400;
        this.errors = options?.errors ?? [];
    }

    send(res) {
        res.status(this.code).json({ message: this.message, ...this });
    }
}
