import { Resource, createResource } from "solid-js";

export const useUserMeida = (constraints?: MediaStreamConstraints | undefined) : Resource<MediaStream | undefined> => {
    const [userMedia,] = createResource<MediaStream>(async () => {
        return await navigator.mediaDevices.getUserMedia(constraints);
    });
    
    return userMedia;
};
