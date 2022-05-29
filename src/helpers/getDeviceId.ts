import {v4 as uuidv4, v5 as uuidv5} from "uuid";

export const getUserId = () => {
    const id = window.localStorage.getItem("MAGICBROAD_DEVICE_ID");
    if (id) {
        return id;
    } else {
        const newId = uuidv4();
        window.localStorage.setItem("MAGICBROAD_DEVICE_ID", newId);
        return newId;
    }
};

export const getUserDeviceId = (user_id: string) => {
    return uuidv5(getUserId(), user_id);
};

export const broadcastId = "00000000-0000-0000-0000-000000000000";

export default getUserId;
