import { Alert } from "react-native";

type ConfirmOptions = {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
    onConfirm: () => void;
};

export function showConfirm({
    title = "Confirm",
    message,
    confirmText = "Yes",
    cancelText = "Cancel",
    destructive = false,
    onConfirm,
}: ConfirmOptions) {
    Alert.alert(
        title,
        message,
        [
            {
                text: cancelText,
                style: "cancel",
            },
            {
                text: confirmText,
                style: destructive ? "destructive" : "default",
                onPress: onConfirm,
            },
        ],
        {
            cancelable: true,
        }
    );
}