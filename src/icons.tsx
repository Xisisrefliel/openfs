type IconProps = { className?: string };

const S = "http://www.w3.org/2000/svg";
const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/* 2x2 company grid mark */
export function CompanyGrid({ className }: IconProps) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M4 4h7v7H4V4Z" className="fill-gray-12" />
      <path d="M13 4h7v7h-7V4Z" className="fill-gray-a9" />
      <path d="M4 13h7v7H4v-7Z" className="fill-gray-a9" />
      <path d="M13 13h7v7h-7v-7Z" className="fill-gray-12" />
    </svg>
  );
}

export function Home({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <path
          d="M3.145 5.95003L8.395 1.96004C8.753 1.68804 9.248 1.68804 9.605 1.96004L14.855 5.95003C15.104 6.13903 15.25 6.43399 15.25 6.74599V14.25C15.25 15.355 14.355 16.25 13.25 16.25H4.75C3.645 16.25 2.75 15.355 2.75 14.25V6.74599C2.75 6.43299 2.896 6.13903 3.145 5.95003Z"
          {...stroke}
        />
        <path d="M9.5 12H8.5C8.2239 12 8 12.224 8 12.5V13.5C8 13.776 8.2239 14 8.5 14H9.5C9.7761 14 10 13.776 10 13.5V12.5C10 12.224 9.7761 12 9.5 12Z" />
        <path d="M6.5 12H5.5C5.2239 12 5 12.224 5 12.5V13.5C5 13.776 5.2239 14 5.5 14H6.5C6.7761 14 7 13.776 7 13.5V12.5C7 12.224 6.7761 12 6.5 12Z" />
        <path d="M12.5 12H11.5C11.2239 12 11 12.224 11 12.5V13.5C11 13.776 11.2239 14 11.5 14H12.5C12.7761 14 13 13.776 13 13.5V12.5C13 12.224 12.7761 12 12.5 12Z" />
        <path d="M9.5 9H8.5C8.2239 9 8 9.224 8 9.5V10.5C8 10.776 8.2239 11 8.5 11H9.5C9.7761 11 10 10.776 10 10.5V9.5C10 9.224 9.7761 9 9.5 9Z" />
        <path d="M6.5 9H5.5C5.2239 9 5 9.224 5 9.5V10.5C5 10.776 5.2239 11 5.5 11H6.5C6.7761 11 7 10.776 7 10.5V9.5C7 9.224 6.7761 9 6.5 9Z" />
        <path d="M12.5 9H11.5C11.2239 9 11 9.224 11 9.5V10.5C11 10.776 11.2239 11 11.5 11H12.5C12.7761 11 13 10.776 13 10.5V9.5C13 9.224 12.7761 9 12.5 9Z" />
      </g>
    </svg>
  );
}

export function Pen({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <path d="M10.78 3.22l4 4L6.5 15.5H2.5v-4l8.28-8.28Z" {...stroke} />
        <path d="M9.75 4.25l4 4" {...stroke} />
      </g>
    </svg>
  );
}

export function Send({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <path d="M5.75,10.022v4.246c0,.409,.464,.645,.794,.404l.74-.539" {...stroke} />
        <path
          d="M2.883,6.935L15.182,2.542c.363-.13,.73,.183,.66,.562l-2.196,11.86c-.067,.363-.492,.531-.789,.311L2.754,7.807c-.322-.238-.248-.738,.129-.873Z"
          {...stroke}
        />
        <line x1="15.58" x2="5.75" y1="2.569" y2="10.022" {...stroke} />
      </g>
    </svg>
  );
}

export function People({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <line x1="9" x2="9" y1="7.25" y2="6.75" {...stroke} />
        <line x1="6.25" x2="6.25" y1="7.25" y2="6.75" {...stroke} />
        <line x1="11.75" x2="11.75" y1="7.25" y2="6.75" {...stroke} />
        <line x1="9" x2="9" y1="10.5" y2="10" {...stroke} />
        <line x1="6.25" x2="6.25" y1="10.5" y2="10" {...stroke} />
        <line x1="7.9288" x2="1.75" y1="16.25" y2="16.25" {...stroke} />
        <path
          d="m3.25,16.25V4.88c0-.385.221-.736.569-.902l4.75-2.272c.273-.13.59-.13.863,0l4.75,2.272c.347.166.569.517.569.902v2.0847"
          {...stroke}
        />
        <path d="M15.6011,17h-4.2021c-.4067,0-.7905-.1987-1.0273-.5317-.2324-.3276-.293-.7476-.1621-1.123.4883-1.4023,1.8105-2.3452,3.2905-2.3452s2.8022.9429,3.291,2.3457c.1304.375.0698.7949-.1626,1.1226-.2368.333-.6206.5317-1.0273.5317Z" />
        <circle cx="13.5" cy="10.5" r="1.5" />
      </g>
    </svg>
  );
}

export function ChartBar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="none">
        <rect x="2.75" y="10.25" width="3" height="5" rx="0.75" {...stroke} />
        <rect x="7.5" y="6.25" width="3" height="9" rx="0.75" {...stroke} />
        <rect x="12.25" y="2.75" width="3" height="12.5" rx="0.75" {...stroke} />
      </g>
    </svg>
  );
}

export function Expenses({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <path d="m6.25,5.25h2.5" {...stroke} />
        <path d="m11.25,5.25h.5" {...stroke} />
        <path d="m6.25,8.25h2.5" {...stroke} />
        <path d="m11.25,8.25h.5" {...stroke} />
        <path d="m14.75,8.4241V3.75c0-1.105-.895-2-2-2h-7.5c-1.105,0-2,.895-2,2v12.5l1.25-.7292" {...stroke} />
        <path d="m7.75,12.5l2.9159,2.9159c1.1046,1.1046,2.8954,1.1046,4,0h0c1.1046-1.1046,1.1046-2.8954,0-4" {...stroke} />
        <polyline points="7.5 16.25 7.5 12.25 11.5 12.25" {...stroke} />
      </g>
    </svg>
  );
}

export function Heart({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <path
          d="M8.529,15.222c.297,.155,.644,.155,.941,0,1.57-.819,6.529-3.787,6.529-8.613,.008-2.12-1.704-3.846-3.826-3.859-1.277,.016-2.464,.66-3.173,1.72-.71-1.06-1.897-1.704-3.173-1.72-2.123,.013-3.834,1.739-3.826,3.859,0,4.826,4.959,7.794,6.529,8.613Z"
          {...stroke}
        />
      </g>
    </svg>
  );
}

export function Transfer({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <polyline points="10.25 12.75 12.75 15.25 15.25 12.75" {...stroke} />
        <polyline points="15.25 5.25 12.75 2.75 10.25 5.25" {...stroke} />
        <line x1="12.75" x2="12.75" y1="15" y2="3" {...stroke} />
        <rect height="5" width="5" rx="1" ry="1" x="2.75" y="10.25" {...stroke} />
        <rect height="5" width="5" rx="1" ry="1" x="2.75" y="2.75" {...stroke} />
      </g>
    </svg>
  );
}

export function Caret({ className }: IconProps) {
  return (
    <svg xmlns={S} width="8" height="8" viewBox="0 0 8 8" className={className}>
      <polygon points="1,1 5,4 1,7" fill="currentColor" />
    </svg>
  );
}

export function SidebarCollapse({ className }: IconProps) {
  return (
    <svg xmlns={S} viewBox="0 0 18 18" className={className}>
      <rect x="1.75" y="3.25" width="14.5" height="11.5" rx="2" ry="2" {...stroke} />
      <rect x="4.75" y="6.25" width="2" height="5.5" fill="currentColor" {...stroke} />
    </svg>
  );
}

export function Magnifier({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <path d="M15.75 15.75L11.6386 11.6386" {...stroke} />
        <path
          d="M7.75 13.25C10.7875 13.25 13.25 10.7875 13.25 7.75C13.25 4.7125 10.7875 2.25 7.75 2.25C4.7125 2.25 2.25 4.7125 2.25 7.75C2.25 10.7875 4.7125 13.25 7.75 13.25Z"
          {...stroke}
        />
      </g>
    </svg>
  );
}

export function Message({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <path
          d="M14.25,2.25H3.75c-1.105,0-2,.896-2,2v7c0,1.104,.895,2,2,2h2v3l3.75-3h4.75c1.105,0,2-.896,2-2V4.25c0-1.104-.895-2-2-2Z"
          {...stroke}
        />
      </g>
    </svg>
  );
}

export function Gear({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <path
          d="M9 11.2495C10.2426 11.2495 11.25 10.2422 11.25 8.99951C11.25 7.75687 10.2426 6.74951 9 6.74951C7.75736 6.74951 6.75 7.75687 6.75 8.99951C6.75 10.2422 7.75736 11.2495 9 11.2495Z"
          {...stroke}
        />
        <path
          d="M16.25 9.35449V8.6445C16.25 8.1345 15.867 7.70651 15.36 7.65051L14.266 7.5285L13.763 6.31451L14.451 5.45551C14.769 5.05751 14.738 4.4845 14.377 4.1235L13.875 3.62149C13.515 3.26149 12.941 3.22949 12.543 3.54749L11.684 4.2355L10.47 3.73251L10.348 2.63849C10.292 2.13249 9.86405 1.7485 9.35405 1.7485H8.64405C8.13405 1.7485 7.70605 2.13149 7.65005 2.63849L7.52805 3.73251L6.31404 4.2355L5.45505 3.54849C5.05705 3.23049 4.48405 3.2615 4.12305 3.6225L3.62104 4.12451C3.26104 4.48451 3.22905 5.05851 3.54705 5.45651L4.23505 6.31549L3.73204 7.52951L2.63805 7.65149C2.13205 7.70749 1.74805 8.13551 1.74805 8.64551V9.3555C1.74805 9.8655 2.13105 10.2935 2.63805 10.3495L3.73204 10.4715L4.23505 11.6855L3.54805 12.5445C3.23005 12.9425 3.26105 13.5165 3.62205 13.8765L4.12405 14.3785C4.48405 14.7385 5.05805 14.7705 5.45605 14.4525L6.31504 13.7645L7.52905 14.2675L7.65105 15.3615C7.70705 15.8675 8.13505 16.2515 8.64505 16.2515H9.35505C9.86505 16.2515 10.293 15.8685 10.349 15.3615L10.471 14.2675L11.685 13.7645L12.544 14.4525C12.942 14.7705 13.515 14.7395 13.876 14.3785L14.378 13.8765C14.738 13.5165 14.77 12.9425 14.452 12.5445L13.765 11.6855L14.268 10.4715L15.362 10.3495C15.868 10.2935 16.252 9.8655 16.252 9.3555L16.25 9.35449Z"
          {...stroke}
        />
      </g>
    </svg>
  );
}

export function Receipt({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <path d="M6.25 11.25H8.75" {...stroke} />
        <path d="M6.25 8.25H7.25" {...stroke} />
        <path d="M11.5 11.25H11.75" {...stroke} />
        <path d="M11.5 8.25H11.75" {...stroke} />
        <path d="M6.25 5.25H8.75" {...stroke} />
        <path d="M11.5 5.25H11.75" {...stroke} />
        <path
          d="M14.75 3.75V16.25L11.75 14.5L9 16.25L6.25 14.5L3.25 16.25V3.75C3.25 2.645 4.145 1.75 5.25 1.75H12.75C13.855 1.75 14.75 2.645 14.75 3.75Z"
          {...stroke}
        />
      </g>
    </svg>
  );
}

export function Dollar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <path d="M9 1.75V3" {...stroke} />
        <path d="M9 15V16.25" {...stroke} />
        <path
          d="M13 3.74989H7.3749C5.9252 3.74989 4.75 4.9251 4.75 6.3748C4.75 7.8245 5.9252 9.00031 7.3749 9.00031H10.6252C12.0749 9.00031 13.2501 10.1755 13.2501 11.6252C13.2501 13.0749 12.0749 14.2501 10.6252 14.2501H5.0001"
          {...stroke}
        />
      </g>
    </svg>
  );
}

export function FileContent({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <line x1="5.75" y1="6.75" x2="7.75" y2="6.75" {...stroke} />
        <line x1="5.75" y1="9.75" x2="12.25" y2="9.75" {...stroke} />
        <line x1="5.75" y1="12.75" x2="12.25" y2="12.75" {...stroke} />
        <path
          d="M2.75,14.25V3.75c0-1.105,.895-2,2-2h5.586c.265,0,.52,.105,.707,.293l3.914,3.914c.188,.188,.293,.442,.293,.707v7.586c0,1.105-.895,2-2,2H4.75c-1.105,0-2-.895-2-2Z"
          {...stroke}
        />
        <path d="M15.16,6.25h-3.41c-.552,0-1-.448-1-1V1.852" {...stroke} />
      </g>
    </svg>
  );
}

export function CircleInfo({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <path
          d="M9 16.25C13.004 16.25 16.25 13.004 16.25 9C16.25 4.996 13.004 1.75 9 1.75C4.996 1.75 1.75 4.996 1.75 9C1.75 13.004 4.996 16.25 9 16.25Z"
          {...stroke}
        />
        <path d="M9 12.75V9.25C9 8.9739 8.7761 8.75 8.5 8.75H7.75" {...stroke} />
        <path d="M9 6.75C8.448 6.75 8 6.301 8 5.75C8 5.199 8.448 4.75 9 4.75C9.552 4.75 10 5.199 10 5.75C10 6.301 9.552 6.75 9 6.75Z" />
      </g>
    </svg>
  );
}

export function MapPin({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <path d="M14.5 14.25C14.9142 14.25 15.25 13.914 15.25 13.5C15.25 13.086 14.9142 12.75 14.5 12.75C14.0858 12.75 13.75 13.086 13.75 13.5C13.75 13.914 14.0858 14.25 14.5 14.25Z" />
        <path
          d="M16.25 8.0244V4.9971C16.25 4.357 15.658 3.8821 15.033 4.021L12.035 4.687C11.849 4.728 11.655 4.71609 11.476 4.65089L6.524 2.8501C6.345 2.7849 6.151 2.77199 5.965 2.81399L2.533 3.5769C2.075 3.679 1.75 4.08499 1.75 4.55299V13.003C1.75 13.6431 2.342 14.118 2.967 13.9791L5.965 13.3131C6.151 13.2721 6.345 13.284 6.524 13.3492L8.7912 14.1732"
          {...stroke}
        />
        <path d="M14.5 17.25C14.5 17.25 11.75 15.741 11.75 13.5C11.75 11.981 12.981 10.75 14.5 10.75C16.019 10.75 17.25 11.981 17.25 13.5C17.25 15.741 14.5 17.25 14.5 17.25Z" {...stroke} />
      </g>
    </svg>
  );
}

export function ArrowRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <line x1="15.25" y1="9" x2="2.75" y2="9" {...stroke} />
        <polyline points="11 4.75 15.25 9 11 13.25" {...stroke} />
      </g>
    </svg>
  );
}

export function ChevronRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <polyline points="6.5 2.75 12.75 9 6.5 15.25" {...stroke} />
      </g>
    </svg>
  );
}

export function CalendarEvent({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <line x1="5.75" y1="2.75" x2="5.75" y2=".75" {...stroke} />
        <line x1="12.25" y1="2.75" x2="12.25" y2=".75" {...stroke} />
        <rect x="2.25" y="2.75" width="13.5" height="12.5" rx="2" ry="2" {...stroke} />
        <line x1="2.25" y1="6.25" x2="15.75" y2="6.25" {...stroke} />
        <circle cx="11.25" cy="10.75" r="1" fill="currentColor" {...stroke} />
      </g>
    </svg>
  );
}

export function Gift({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <line x1="9" y1="5.25" x2="9" y2="16.25" {...stroke} />
        <path d="M3.75,3.5c0-.966,.784-1.75,1.75-1.75,2.589,0,3.5,3.5,3.5,3.5h-3.5c-.966,0-1.75-.784-1.75-1.75Z" {...stroke} />
        <path d="M12.5,5.25h-3.5s.911-3.5,3.5-3.5c.966,0,1.75,.784,1.75,1.75s-.784,1.75-1.75,1.75Z" {...stroke} />
        <path d="M14.25,8.25v6c0,1.105-.895,2-2,2H5.75c-1.105,0-2-.895-2-2v-6" {...stroke} />
        <rect x="1.75" y="5.25" width="14.5" height="3" rx="1" ry="1" {...stroke} />
      </g>
    </svg>
  );
}

export function Star({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <polygon
          points="9 1.75 11.24 6.289 16.25 7.017 12.625 10.551 13.481 15.54 9 13.185 4.519 15.54 5.375 10.551 1.75 7.017 6.76 6.289 9 1.75"
          {...stroke}
        />
      </g>
    </svg>
  );
}

export function Xmark({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <line x1="14" y1="4" x2="4" y2="14" {...stroke} />
        <line x1="4" y1="4" x2="14" y2="14" {...stroke} />
      </g>
    </svg>
  );
}

export function Check({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 18" className={className} xmlns={S}>
      <g fill="currentColor">
        <polyline points="2.75 9.25 6.75 14.25 15.25 3.75" {...stroke} />
      </g>
    </svg>
  );
}

export function GitBranch({ className }: IconProps) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="18" cy="18" r="3" />
      <circle cx="6" cy="6" r="3" />
      <path d="M6 21V9a9 9 0 0 0 9 9" />
    </svg>
  );
}

export function Warp({ className }: IconProps) {
  return (
    <svg viewBox="0 0 350 350" xmlns={S} fill="none" className={className}>
      <g fill="currentColor" clipPath="url(#warp-icon-clip)">
        <path d="M341.87 122.39A175.4 175.4 0 0 0 224.76 7.21c21.37 68.74 71.94 110.54 117.11 115.18" />
        <path d="m345.73 136.78-.61-2.66C276.82 131.98 208.24 86.83 189.65.61q-7.28-.61-14.72-.62c-12.08 0-23.87 1.22-35.26 3.55 26.94 83.98 123.11 131.57 206.06 133.23z" />
        <path d="M348.13 149.95c-118.71-.69-218.72-60.46-249.67-132.4a176 176 0 0 0-53.29 40.03c66.49 57.59 183.26 94.65 303.33 95q-.17-1.32-.37-2.63" />
        <path d="M349.68 165.77c-101.84-.05-244.09-15.45-332.26-67.13a174 174 0 0 0-15.43 49.35c97.11 17.89 226.18 20.16 347.78 20.17q-.05-1.19-.09-2.39zM224.85 342.76a175.4 175.4 0 0 0 116.93-114.88c-45.08 4.68-95.52 46.36-116.93 114.88" />
        <path d="m345.05 216.13.62-2.66c-82.86 1.68-178.88 49.18-205.93 132.98a176 176 0 0 0 49.96 2.91c18.67-86.02 87.15-131.08 155.35-133.24z" />
        <path d="m348.09 200.31.37-2.63c-119.98.35-236.66 37.37-303.16 94.88a176 176 0 0 0 53.26 39.93C129.61 260.66 229.52 201 348.1 200.31z" />
        <path d="M349.77 182.11c-121.58 0-250.62 2.28-347.73 20.16a174 174 0 0 0 15.48 49.3c88.17-51.63 230.33-67.02 332.14-67.07q.06-1.19.11-2.38z" />
      </g>
      <defs>
        <clipPath id="warp-icon-clip">
          <path fill="white" d="M0 0h350v350H0z" />
        </clipPath>
      </defs>
    </svg>
  );
}
