import type { SVGProps } from "react";

/**
 * Geist icon language (vercel.com/geist/icons): 16px default, 24-unit grid,
 * 1.5 stroke, currentColor, round caps. @vercel/geistcn-assets is not public.
 */
export type GeistIconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

function GeistIcon({
  size = 16,
  children,
  className,
  ...props
}: GeistIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden={props["aria-hidden"] ?? true}
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconFile(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <path d="M14 3H7.5A1.5 1.5 0 0 0 6 4.5v15A1.5 1.5 0 0 0 7.5 21h9a1.5 1.5 0 0 0 1.5-1.5V8.5L14 3Z" />
      <path d="M14 3v5.5h5.5" />
      <path d="M9 13h6" />
      <path d="M9 16.5h4" />
    </GeistIcon>
  );
}

export function IconUpload(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <path d="M7.4 17.6A5 5 0 0 1 8 8.1 6.2 6.2 0 0 1 20 10.5a4 4 0 0 1-1 7.9H16" />
      <path d="M12 17.5V11" />
      <path d="M9.5 13.5 12 11l2.5 2.5" />
    </GeistIcon>
  );
}

export function IconImage(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="1.5" />
      <circle cx="8.5" cy="10" r="1.4" />
      <path d="m3.8 16.2 5-4.4 3.3 2.9 3.4-3.2 4.8 4.7" />
    </GeistIcon>
  );
}

export function IconWarning(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 8.2v4.4" />
      <path d="M12 15.8h.01" />
    </GeistIcon>
  );
}

export function IconRefreshCw(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <path d="M20 12a8 8 0 1 1-2.2-5.5" />
      <path d="M20 4.5V8h-3.5" />
    </GeistIcon>
  );
}

export function IconSpinner(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5" />
    </GeistIcon>
  );
}

export function IconPlay(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <path d="M8.2 5.8v12.4L18.5 12 8.2 5.8Z" />
    </GeistIcon>
  );
}

export function IconClock(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.8V12l3.2 2" />
    </GeistIcon>
  );
}

export function IconCheck(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <path d="m5.5 12.2 4.2 4.3 8.8-9" />
    </GeistIcon>
  );
}

export function IconCpu(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <rect x="7" y="7" width="10" height="10" rx="1.2" />
      <path d="M9.5 10h5v4h-5z" />
      <path d="M12 3.5v3.5M12 17v3.5M3.5 12H7M17 12h3.5M6.2 6.2l1.6 1.6M16.2 16.2l1.6 1.6M17.8 6.2l-1.6 1.6M6.2 17.8l1.6-1.6" />
    </GeistIcon>
  );
}

export function IconLightning(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <path d="M13.2 3.5 6.5 13.2h5.1L10.8 20.5l6.7-9.7h-5.1L13.2 3.5Z" />
    </GeistIcon>
  );
}

export function IconScale(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <path d="M12 4.5v4" />
      <path d="M8 20.5h8" />
      <path d="M12 8.5 6.5 16h5.5" />
      <path d="M12 8.5 17.5 16H12" />
      <path d="M4.8 16H8.2" />
      <path d="M15.8 16h3.4" />
    </GeistIcon>
  );
}

export function IconCurrencyDollar(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <path d="M12 4.5v15" />
      <path d="M15.6 8.2c-.5-1.6-2-2.4-3.6-2.4-2 0-3.5 1.2-3.5 2.9 0 3.8 7.1 1.8 7.1 5.6 0 1.8-1.6 3.1-3.8 3.1-1.8 0-3.4-.8-4-2.5" />
    </GeistIcon>
  );
}

export function IconList(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <path d="M9 7h11" />
      <path d="M9 12h11" />
      <path d="M9 17h11" />
      <circle cx="5.2" cy="7" r="1.1" />
      <circle cx="5.2" cy="12" r="1.1" />
      <circle cx="5.2" cy="17" r="1.1" />
    </GeistIcon>
  );
}

export function IconAlignLeft(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <path d="M4.5 7h15" />
      <path d="M4.5 12h10" />
      <path d="M4.5 17h13" />
    </GeistIcon>
  );
}

export function IconShield(props: GeistIconProps) {
  return (
    <GeistIcon {...props}>
      <path d="M12 3.8 5.2 6.2v5.4c0 4.2 2.8 7.3 6.8 8.6 4-1.3 6.8-4.4 6.8-8.6V6.2L12 3.8Z" />
      <path d="M12 8.2v4.2" />
      <path d="M12 15.4h.01" />
    </GeistIcon>
  );
}
