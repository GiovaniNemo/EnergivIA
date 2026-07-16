"use client";

import * as React from "react";
import MuiDrawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { cn } from "@energivia/utils";

function isMuiFloatingLayerTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(".MuiAutocomplete-popper") ||
    target.closest(".MuiPopover-root") ||
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

type DrawerContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const DrawerContext = React.createContext<DrawerContextValue | null>(null);

function useDrawerContext(component: string): DrawerContextValue {
  const ctx = React.useContext(DrawerContext);
  if (!ctx) {
    throw new Error(`${component} must be used within <Drawer>`);
  }
  return ctx;
}

type DrawerRootProps = {
  children?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

function Drawer({
  children,
  open: openProp,
  defaultOpen,
  onOpenChange,
}: DrawerRootProps): JSX.Element {
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

  return <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>;
}

type DrawerTriggerProps = React.HTMLAttributes<HTMLElement> & {
  asChild?: boolean;
  children: React.ReactNode;
};

function DrawerTrigger({ asChild, children, ...props }: DrawerTriggerProps): JSX.Element {
  const { setOpen } = useDrawerContext("DrawerTrigger");

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

function DrawerClose({ asChild, children, ...props }: DrawerTriggerProps): JSX.Element {
  const { setOpen } = useDrawerContext("DrawerClose");

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

function DrawerPortal({ children }: { children: React.ReactNode }): JSX.Element {
  return <>{children}</>;
}

function DrawerOverlay(): null {
  return null;
}

type DrawerContentProps = Omit<React.HTMLAttributes<HTMLDivElement>, "title"> & {
  showCloseButton?: boolean;
  onPointerDownOutside?: (event: React.PointerEvent | PreventableStub) => void;
  onFocusOutside?: (event: unknown) => void;
  onInteractOutside?: (event: React.SyntheticEvent | PreventableStub) => void;
};

const DrawerContent = React.forwardRef<HTMLDivElement, DrawerContentProps>(
  (
    {
      className,
      children,
      showCloseButton = true,
      onPointerDownOutside,
      onFocusOutside: _onFocusOutside,
      onInteractOutside,
      ...rest
    },
    ref
  ) => {
    const { open, setOpen } = useDrawerContext("DrawerContent");
    const { style: paperStyle, ...drawerRest } = rest as typeof rest & {
      style?: React.CSSProperties;
    };

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
        setOpen(false);
      },
      [setOpen, onPointerDownOutside, onInteractOutside]
    );

    return (
      <MuiDrawer
        anchor="right"
        open={open}
        onClose={handleClose}
        slotProps={{
          paper: {
            ref,
            style: paperStyle,
            className: cn(
              "box-border flex w-full max-w-md flex-col border-l border-[var(--color-border)] bg-[var(--color-card)] shadow-[0_0_48px_rgba(0,0,0,0.35)] outline-none",
              className
            ),
            sx: {
              bgcolor: "var(--color-card)",
              color: "var(--color-foreground)",
            },
          },
        }}
        {...drawerRest}
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
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pt-12">
          {children}
        </div>
      </MuiDrawer>
    );
  }
);
DrawerContent.displayName = "DrawerContent";

const DrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>): JSX.Element => (
  <div className={cn("border-b border-[var(--color-border)] px-5 pb-4", className)} {...props} />
);

const DrawerTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn("text-lg font-semibold text-[var(--color-foreground)]", className)}
      {...props}
    />
  )
);
DrawerTitle.displayName = "DrawerTitle";

export {
  Drawer,
  DrawerTrigger,
  DrawerClose,
  DrawerPortal,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
};
