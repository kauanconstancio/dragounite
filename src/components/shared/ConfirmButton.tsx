import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = Omit<ButtonProps, "onClick"> & {
  /** Title shown in the confirmation dialog. */
  title?: string;
  /** Description / question shown to the user. */
  description?: React.ReactNode;
  /** Label of the confirm action button. Defaults to "Confirmar". */
  confirmLabel?: string;
  /** Label of the cancel action button. Defaults to "Cancelar". */
  cancelLabel?: string;
  /** Called when the user confirms. */
  onConfirm: () => void;
  /** Style the confirm action as destructive (red). Defaults to true. */
  destructive?: boolean;
  children: React.ReactNode;
};

/**
 * Drop-in replacement for `if (confirm("...")) doX()` patterns. Renders the
 * given button as the trigger and shows a styled AlertDialog.
 */
export function ConfirmButton({
  title = "Tem certeza?",
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onConfirm,
  destructive = true,
  children,
  ...buttonProps
}: Props) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button {...buttonProps}>{children}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(destructive && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
