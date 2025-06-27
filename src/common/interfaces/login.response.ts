export default interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: string;
    expiresAt: Date;
    user: {
        id: number;
        email: string;
        fullName?: string | null;

    };
}