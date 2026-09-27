import { getServerSession } from "next-auth";
import { authOptions } from "./[...nextauth]/auth";

export default async function handler(req: any, res: any) {
    const session = await getServerSession(req, res, authOptions);
    if (session) {
        return res.status(200).json({ message: 'Logged out successfully' });
    }
}
