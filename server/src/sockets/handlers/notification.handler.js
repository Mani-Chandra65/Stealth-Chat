export const registerNotificationHandlers = (
    io,
    socket
) => {

    socket.on(
        "notification:mark-read",
        async (payload) => {

        }
    );
    socket.on(
        "notification:get",
        async (payload) => {

        }
    );
};