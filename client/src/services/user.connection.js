import axios from "axios";

export const sendConnectionRequest = async (userId, accessToken) => {
    try {
        const response = await axios.post(
            `/api/v1/connections/request`,
            { userId },
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error("Failed to send connection request:", error);
        throw error.response?.data || new Error("An unexpected error occurred while sending the connection request.");
    }
}