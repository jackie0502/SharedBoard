class DomainError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = "DomainError";
        this.details = details;
    }
}

module.exports = { DomainError };
