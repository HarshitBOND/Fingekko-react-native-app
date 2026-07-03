import React from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

type ConfirmDialogProps = {
    visible: boolean;
    title: string;
    message: string;

    confirmText?: string;
    cancelText?: string;

    destructive?: boolean;
    loading?: boolean;

    onConfirm: () => void;
    onCancel: () => void;
};

export default function ConfirmDialog({
    visible,
    title,
    message,
    confirmText = "Confirm",
    cancelText = "Cancel",
    destructive = false,
    loading = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
        >
            <View style={styles.overlay}>
                <View style={styles.container}>

                    <Text style={styles.title}>
                        {title}
                    </Text>

                    <Text style={styles.message}>
                        {message}
                    </Text>

                    <View style={styles.buttons}>

                        <Pressable
                            style={styles.cancelButton}
                            onPress={onCancel}
                            disabled={loading}
                        >
                            <Text style={styles.cancelText}>
                                {cancelText}
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.confirmButton,
                                destructive && styles.destructiveButton,
                            ]}
                            onPress={onConfirm}
                            disabled={loading}
                        >
                            <Text style={styles.confirmText}>
                                {loading ? "Please wait..." : confirmText}
                            </Text>
                        </Pressable>

                    </View>

                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.45)",
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 25,
    },

    container: {
        width: "100%",
        backgroundColor: "#fff",
        borderRadius: 22,
        padding: 22,
    },

    title: {
        fontSize: 20,
        fontWeight: "700",
        color: "#111827",
    },

    message: {
        marginTop: 12,
        fontSize: 15,
        color: "#6b7280",
        lineHeight: 22,
    },

    buttons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 28,
    },

    cancelButton: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
        marginRight: 10,
        backgroundColor: "#F3F4F6",
    },

    confirmButton: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 10,
        backgroundColor: "#148A46",
    },

    destructiveButton: {
        backgroundColor: "#DC2626",
    },

    cancelText: {
        color: "#374151",
        fontWeight: "600",
    },

    confirmText: {
        color: "white",
        fontWeight: "700",
    },
});