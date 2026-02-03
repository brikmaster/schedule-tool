"use client";

import React from "react";
import Modal from "./Modal";
import Button from "./Button";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "warning",
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const variantStyles = {
    danger: "bg-red-50 border-red-200",
    warning: "bg-orange-50 border-orange-200",
    info: "bg-blue-50 border-blue-200",
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="sm">
      <div className={`p-4 rounded border ${variantStyles[variant]} mb-6`}>
        <p className="text-[var(--ss-text)]">{message}</p>
      </div>
      <div className="flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          {cancelText}
        </Button>
        <Button onClick={handleConfirm}>{confirmText}</Button>
      </div>
    </Modal>
  );
}
