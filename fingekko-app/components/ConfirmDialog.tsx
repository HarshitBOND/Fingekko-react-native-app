import React from "react";
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import Card from "./ui/Card";
import Button from "./ui/Button";

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
            onRequestClose={onCancel}
        >
            <View style={styles.overlay} accessibilityViewIsModal={true} accessibilityRole="alert">
                <Card variant="tactile" style={styles.containerCard}>
                    <Text style={styles.title}>
                        {title}
                    </Text>

                    <Text style={styles.message}>
                        {message}
                    </Text>

                    <View style={styles.buttons}>
                        <Button
                            variant="outline"
                            size="md"
                            onPress={onCancel}
                            disabled={loading}
                            style={styles.dialogButton}
                        >
                            {cancelText}
                        </Button>

                        <Button
                            variant={destructive ? "danger" : "primary"}
                            size="md"
                            onPress={onConfirm}
                            disabled={loading}
                            loading={loading}
                            style={styles.dialogButton}
                        >
                            {confirmText}
                        </Button>
                    </View>
                </Card>
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

    containerCard: {
        width: "100%",
    },

    title: {
        fontSize: 20,
        fontWeight: "800",
        color: "#111827",
    },

    message: {
        marginTop: 12,
        fontSize: 15,
        color: "#4b5563",
        lineHeight: 22,
        fontWeight: "600",
    },

    buttons: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginTop: 24,
        gap: 12,
    },

    dialogButton: {
        flex: 1,
    },

    cancelText: {
        color: "#374151",
        fontWeight: "800",
    },

    confirmText: {
        color: "white",
        fontWeight: "800",
    },
});