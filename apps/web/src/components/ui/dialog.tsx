"use client";

import * as React from "react";
import MuiDialog from "@mui/material/Dialog";
import type { DialogProps as MuiDialogProps } from "@mui/material/Dialog";
import MuiDialogContentText from "@mui/material/DialogContentText";
import MuiDialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { cn } from "@energivia/utils";

function isMuiFloatingLayerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(".MuiAutocomplete-popper") ||
    target.closest(".MuiPopover-root") ||
    target.closest(".MuiModal-root") ||
    target.closest(".MuiPickersPopper-root") ||
    target.closest(".MuiMenu-root") ||
    target.closest(".MuiPopper-root")
  );
}

type PreventableStub = {
  target: EventTarget | null;
  currentTarget: EventTarget | null;
  preventDefault: () => void;
  readonly defaultPrevented: boolean;
};

function createPointerOutsideStub(target: EventTarget | null): PreventableStub {
  let prevented = false;
  return {
    target,
    currentTarget: null,
    preventDefault() {
      prevented = true;
    },
    get defaultPrevented() {
      return prevented;
    },
  };
}

function createEscapeStub(): PreventableStub & { key: string } {
  let prevented = false;
  return {
    target: null,
    currentTarget: null,
    key: "Escape",
    preventDefault() {
      prevented = true;
    },
    get defaultPrevented() {
      return prevented;
    },
  };
}

type DialogContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext(component: string): DialogContextValue {
  const ctx = React.useContext(DialogContext);
  if (!ctx) {
    throw new Error(`${component} must be used within <Dialog>`);
  }
  return ctx;
}

type DialogRootProps = {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function Dialog({
  children,
  open: openProp,
  defaultOpen,
  onOpenChange,
}: DialogRootProps): JSX.Element {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(Boolean(defaultOpen));
  const isControlled = openProp !== undefined;
  const open = isControlled ? Boolean(openProp) : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(next);
      }
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const value = React.useMemo(() => ({ open, setOpen }), [open, setOpen]);

  return <DialogContext.Provider value={value}>{children}</DialogContext.Provider>;
}

type DialogTriggerProps = React.HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
  children: React.ReactNode;
};

function DialogTrigger({ asChild, children, ...props }: DialogTriggerProps): JSX.Element {
  const { setOpen } = useDialogContext("DialogTrigger");

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: React.MouseEventHandler }>;
    return React.cloneElement(child, {
      ...props,
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        if (!e.defaultPrevented) {
          setOpen(true);
        }
      },
    } as Partial<unknown>);
  }

  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        props.onClick?.(e as never);
        setOpen(true);
      }}
    >
      {children}
    </button>
  );
}

function DialogPortal({ children }: { children: React.ReactNode }): JSX.Element {
  return <>{children}</>;
}

function DialogOverlay(): null {
  return null;
}

type DialogCloseProps = React.HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
  children: React.ReactNode;
};

function DialogClose({ asChild, children, ...props }: DialogCloseProps): JSX.Element {
  const { setOpen } = useDialogContext("DialogClose");

  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ onClick?: React.MouseEventHandler }>;
    return React.cloneElement(child, {
      ...props,
      onClick: (e: React.MouseEvent) => {
        child.props.onClick?.(e);
        if (!e.defaultPrevented) {
          setOpen(false);
        }
      },
    } as Partial<unknown>);
  }

  return (
    <button
      type="button"
      {...props}
      onClick={(e) => {
        props.onClick?.(e as never);
        setOpen(false);
      }}
    >
      {children}
    </button>
  );
}

type DialogContentProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  muiMaxWidth?: MuiDialogProps["maxWidth"];
  showCloseButton?: boolean;
  allowOverflow?: boolean;
  stickyChrome?: boolean;
  onPointerDownOutside?: (event: React.PointerEvent | PreventableStub) => void;
  onFocusOutside?: (event: unknown) => void;
  onInteractOutside?: (event: React.SyntheticEvent | PreventableStub) => void;
  onEscapeKeyDown?: (event: React.KeyboardEvent | PreventableStub) => void;
};

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  (
    {
      className,
      children,
      muiMaxWidth = "sm",
      showCloseButton = true,
      allowOverflow = false,
      stickyChrome = false,
      onPointerDownOutside,
      onFocusOutside: _onFocusOutside,
      onInteractOutside,
      onEscapeKeyDown,
      ...rest
    },
    ref
  ) => {
    const { open, setOpen } = useDialogContext("DialogContent");
    const { style: paperStyle, ...dialogRest } = rest as typeof rest & {
      style?: React.CSSProperties;
    };
    const paperHasFlushPadding = /\bp-0\b/u.test(String(className ?? ""));
    const reserveCloseButtonTopPadding = showCloseButton && !paperHasFlushPadding;

    const handleClose = React.useCallback(
      (_event: unknown, reason: string) => {
        if (reason === "backdropClick") {
          const target = (_event as { target?: EventTarget | null })?.target ?? null;
          if (isMuiFloatingLayerTarget(target)) {
            return;
          }
          const stub = createPointerOutsideStub(target);
          onPointerDownOutside?.(stub as unknown as React.PointerEvent<HTMLElement>);
          if (stub.defaultPrevented) {
            return;
          }
          onInteractOutside?.(stub as unknown as React.SyntheticEvent);
          if (stub.defaultPrevented) {
            return;
          }
        }
        if (reason === "escapeKeyDown") {
          const stub = createEscapeStub();
          onEscapeKeyDown?.(stub as unknown as React.KeyboardEvent);
          if (stub.defaultPrevented) {
            return;
          }
        }
        setOpen(false);
      },
      [setOpen, onPointerDownOutside, onInteractOutside, onEscapeKeyDown]
    );

    return (
      <MuiDialog
        open={open}
        onClose={handleClose}
        maxWidth={muiMaxWidth}
        scroll="paper"
        disableEnforceFocus={allowOverflow}
        slotProps={{
          paper: {
            ref,
            style: paperStyle,
            className: cn(
              "relative my-auto box-border flex w-full max-h-[min(90vh,calc(100dvh-2rem))] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] px-6 pb-6 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)] outline-none ring-1 ring-white/[0.06]",
              showCloseButton && !paperHasFlushPadding && "pt-12",
              !showCloseButton && "pt-6",
              allowOverflow ? "overflow-visible" : "overflow-hidden",
              className,
              reserveCloseButtonTopPadding && "!pt-14"
            ),
            sx: {
              bgcolor: "var(--color-card)",
              color: "var(--color-foreground)",
              ...(muiMaxWidth === false && {
                maxWidth: "none !important",
              }),
            },
          },
        }}
        {...dialogRest}
      >
        {showCloseButton ? (
          <IconButton
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            size="small"
            sx={{
              position: "absolute",
              right: 12,
              top: 12,
              zIndex: 200,
              border: "1px solid var(--color-border)",
              bgcolor: "var(--color-card)",
              color: "var(--color-foreground)",
              borderRadius: 2,
              "&:hover": {
                bgcolor: "var(--color-accent)",
                color: "var(--color-accent-foreground)",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        ) : null}
        <div
          className={cn(
            "min-h-0 flex-1 p-1",
            stickyChrome && "flex flex-col overflow-hidden",
            !stickyChrome &&
              (allowOverflow ? "overflow-visible" : "overflow-y-auto overscroll-contain")
          )}
        >
          {children}
        </div>
      </MuiDialog>
    );
  }
);
DialogContent.displayName = "DialogContent";

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element => (
  <div className={cn("flex flex-col gap-1.5 text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element => (
  <div
    className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";

export type DialogTitleProps = React.ComponentProps<typeof MuiDialogTitle>;

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <MuiDialogTitle
      ref={ref}
      className={cn(
        "text-xl font-semibold leading-tight tracking-tight text-[var(--color-foreground)]",
        className
      )}
      sx={{
        p: 0,
        m: 0,
        mb: 0,
        fontSize: "1.25rem",
        fontWeight: 600,
        lineHeight: 1.25,
        letterSpacing: "-0.02em",
        color: "var(--color-foreground)",
      }}
      {...props}
      component="h2"
    />
  )
);
DialogTitle.displayName = "DialogTitle";

export type DialogDescriptionProps = React.ComponentProps<typeof MuiDialogContentText>;

const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, ...props }, ref) => (
    <MuiDialogContentText
      ref={ref}
      component="p"
      className={cn("text-sm text-[var(--color-muted-foreground)]", className)}
      sx={{
        m: 0,
        mt: 0.5,
        color: "var(--color-muted-foreground)",
        fontSize: "0.875rem",
        lineHeight: 1.5,
      }}
      {...props}
    />
  )
);
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
