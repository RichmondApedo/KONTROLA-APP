
"use client"

import * as React from "react"
import { Slot, Slottable } from "@radix-ui/react-slot"
import { ChevronDown, PanelLeft } from "lucide-react"
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type SidebarContext = {
  isCollapsed: boolean
  isMobile: boolean
  setCollapsed: (collapsed: boolean) => void
  isSheetOpen: boolean
  setSheetOpen: (open: boolean) => void
  isInsideMobileSheet?: boolean
}

const SidebarContext = React.createContext<SidebarContext | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    defaultCollapsed?: boolean
    collapsed?: boolean
    onCollapseChange?: (collapsed: boolean) => void
    breakpoint?: number
  }
>(
  (
    {
      defaultCollapsed = false,
      collapsed: collapsedProp,
      onCollapseChange: setCollapsedProp,
      breakpoint = 768,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [isMobile, setIsMobile] = React.useState(false)
    const [isSheetOpen, setSheetOpen] = React.useState(false)

    const [_collapsed, _setCollapsed] = React.useState(defaultCollapsed)
    const isCollapsed = collapsedProp ?? _collapsed
    const setCollapsed = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const collapsedState = typeof value === "function" ? value(isCollapsed) : value
        if (setCollapsedProp) {
          setCollapsedProp(collapsedState)
        } else {
          _setCollapsed(collapsedState)
        }
      },
      [setCollapsedProp, isCollapsed]
    )

    React.useEffect(() => {
      const handleResize = () => {
        setIsMobile(window.innerWidth < breakpoint)
      }
      handleResize()
      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }, [breakpoint])

    React.useEffect(() => {
        if(isMobile) {
            setCollapsed(true)
        }
    }, [isMobile, setCollapsed])


    const contextValue = React.useMemo<SidebarContext>(
      () => ({
        isCollapsed: isMobile ? false : isCollapsed,
        isMobile,
        setCollapsed,
        isSheetOpen: isMobile ? isSheetOpen : false,
        setSheetOpen,
      }),
      [isCollapsed, isMobile, setCollapsed, isSheetOpen]
    )

    return (
      <SidebarContext.Provider value={contextValue}>
        <div
          ref={ref}
          className={cn(
            "group/sidebar-wrapper",
            "data-[collapsed=true]:w-[52px]",
            className
          )}
          data-collapsed={isCollapsed && !isMobile}
          {...props}
        >
          {children}
        </div>
      </SidebarContext.Provider>
    )
  }
)
SidebarProvider.displayName = "SidebarProvider"


const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { children: React.ReactNode }
>(({ className, children, ...props }, ref) => {
  const { isMobile, isCollapsed, isSheetOpen, setSheetOpen } = useSidebar()

  if (isMobile) {
      return (
        <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
            <SheetContent side="left" className="p-0" >
                {children}
            </SheetContent>
        </Sheet>
      );
  }

  return (
    <aside
      ref={ref}
      className={cn(
        "hidden h-screen flex-col border-r bg-card text-card-foreground shadow-sm transition-all duration-300 md:flex",
        isCollapsed ? "w-[52px]" : "w-64",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  )
})
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, ...props }, ref) => {
  const { isMobile, setCollapsed, setSheetOpen } = useSidebar();
  
  if (isMobile) {
    return (
        <Button
            ref={ref}
            variant="ghost"
            size="icon"
            className={cn("md:hidden", className)}
            onClick={() => setSheetOpen(true)}
            {...props}
        >
            <PanelLeft />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>
    )
  }

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      className={cn("hidden md:inline-flex", className)}
      onClick={() => setCollapsed(c => !c)}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  )
})
SidebarTrigger.displayName = "SidebarTrigger"


const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex h-16 items-center px-4", className)}
      {...props}
    />
  )
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-1 flex-col overflow-auto", className)}
      {...props}
    />
  )
})
SidebarContent.displayName = "SidebarContent"

const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("mt-auto flex flex-col p-2", className)}
      {...props}
    />
  )
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarSection = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { isCollapsible?: boolean }
>(({ className, isCollapsible = true, ...props }, ref) => {
  const { isCollapsed } = useSidebar()
  if (isCollapsed && isCollapsible) {
    return (
      <div
        ref={ref}
        className={cn(
          "flex flex-col p-2",
          className
        )}
        {...props}
      />
    )
  }
  return (
    <div
      ref={ref}
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
})
SidebarSection.displayName = "SidebarSection"

const SidebarSectionHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, children, ...props }, ref) => {
  const { isCollapsed } = useSidebar()

  if (isCollapsed) {
    return null
  }

  return (
    <div
      ref={ref}
      className={cn("flex h-16 items-center px-4", className)}
      {...props}
    >
        <Slottable>{children}</Slottable>
    </div>
  )
})
SidebarSectionHeader.displayName = "SidebarSectionHeader"

const SidebarSectionTitle = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentProps<"p">
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn("text-sm font-medium text-muted-foreground", className)}
      {...props}
    />
  )
})
SidebarSectionTitle.displayName = "SidebarSectionTitle"

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      role="group"
      className={cn("flex flex-col gap-1 p-2", className)}
      {...props}
    />
  )
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarItem = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { isActive?: boolean; asChild?: boolean }
>(({ className, isActive, asChild, onClick, ...props }, ref) => {
  const Comp = asChild ? Slot : "div"
  const { isMobile, setSheetOpen } = useSidebar();

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMobile) {
      setSheetOpen(false);
    }
    onClick?.(e as any);
  }

  return (
    <Comp
      ref={ref}
      data-active={isActive}
      onClick={handleClick}
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
        "group-data-[collapsed=true]:justify-center group-data-[collapsed=true]:px-0 group-data-[collapsed=true]:py-2",
        isActive && "bg-accent text-accent-foreground",
        className
      )}
      {...props}
    />
  )
})
SidebarItem.displayName = "SidebarItem"

const SidebarLabel = React.forwardRef<
  HTMLSpanElement,
  React.ComponentProps<"span">
>(({ className, ...props }, ref) => {
  const { isCollapsed } = useSidebar()
  return (
    <span
      ref={ref}
      className={cn(
        "flex-1 group-data-[collapsed=true]:hidden",
        className
      )}
      {...props}
    />
  )
})
SidebarLabel.displayName = "SidebarLabel"

const SidebarSeparator = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
    const { isCollapsed } = useSidebar();
    if(isCollapsed) return <div ref={ref} className={cn("my-2 border-t", className)} {...props} />
    return <div ref={ref} className={cn("mx-4 my-2 border-t", className)} {...props} />;
});
SidebarSeparator.displayName = "SidebarSeparator";


type SidebarCollapsibleContextValue = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isCollapsible: boolean;
};

const SidebarCollapsibleContext = React.createContext<SidebarCollapsibleContextValue | null>(null);


const SidebarCollapsible = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { defaultOpen?: boolean }
>(({ defaultOpen = false, ...props }, ref) => {
  const { isCollapsed } = useSidebar();
  const [open, setOpen] = React.useState(defaultOpen);

  React.useEffect(() => {
    if (isCollapsed) {
      setOpen(false);
    }
  }, [isCollapsed]);

  return (
    <SidebarCollapsibleContext.Provider value={{ open, onOpenChange: setOpen, isCollapsible: !isCollapsed }}>
      <div ref={ref} {...props} />
    </SidebarCollapsibleContext.Provider>
  );
});
SidebarCollapsible.displayName = "SidebarCollapsible";

const SidebarCollapsibleTrigger = React.forwardRef<
    React.ElementRef<typeof SidebarItem>,
    React.ComponentProps<typeof SidebarItem>
>(({ ...props }, ref) => {
    const context = React.useContext(SidebarCollapsibleContext);
    if (!context) {
        throw new Error("SidebarCollapsibleTrigger must be used within a SidebarCollapsible");
    }
    const { open, onOpenChange, isCollapsible } = context;
    const { isCollapsed } = useSidebar()


    const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        if(isCollapsible) {
            onOpenChange(!open)
        }
        props.onClick?.(e)
    }

    if (isCollapsed) {
        return (
            <div ref={ref} {...props} />
        )
    }

    return (
        <SidebarItem ref={ref} {...props} onClick={handleClick}>
            {props.children}
            {isCollapsible && <ChevronDown className={cn("ml-auto h-4 w-4 shrink-0 transition-transform duration-200", open && "rotate-180")} />}
        </SidebarItem>
    );
});
SidebarCollapsibleTrigger.displayName = "SidebarCollapsibleTrigger";


const SidebarCollapsibleContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
    const context = React.useContext(SidebarCollapsibleContext);
    if (!context) {
        throw new Error("SidebarCollapsibleContent must be used within a SidebarCollapsible");
    }
    const { open, isCollapsible } = context;

    if (!open || !isCollapsible) return null;

  return (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-1 overflow-hidden transition-all data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down",
        className
      )}
      data-state={open ? "open" : "closed"}
      {...props}
    />
  );
});
SidebarCollapsibleContent.displayName = "SidebarCollapsibleContent";


export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarItem,
  SidebarLabel,
  SidebarProvider,
  SidebarSection,
  SidebarSectionHeader,
  SidebarSectionTitle,
  SidebarSeparator,
  SidebarTrigger,
  SidebarCollapsible,
  SidebarCollapsibleTrigger,
  SidebarCollapsibleContent,
  useSidebar,
}
