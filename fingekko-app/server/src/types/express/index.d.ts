import "express"

declare global {
    namespace Express {
        interface Request {
            user: AuthUser;

            auth?: {
                clerkId: string;
            };
        }
    }
}

export { };