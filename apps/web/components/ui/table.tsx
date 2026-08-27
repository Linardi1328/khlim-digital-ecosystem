"use client";

import React, {
  type TableHTMLAttributes,
  forwardRef,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";

export const Table = forwardRef<
  HTMLTableElement,
  TableHTMLAttributes<HTMLTableElement>
>(({ style, ...props }, ref) => (
  <div style={{ width: "100%", overflowX: "auto" }}>
    <table
      ref={ref}
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: "0.875rem",
        textAlign: "left",
        ...style,
      }}
      {...props}
    />
  </div>
));
Table.displayName = "Table";

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ style, ...props }, ref) => (
  <thead
    ref={ref}
    style={{
      borderBottom: "1px solid #E4E4E7",
      backgroundColor: "#FAFAFA",
      ...style,
    }}
    {...props}
  />
));
TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ style, ...props }, ref) => (
  <tbody ref={ref} style={{ ...style }} {...props} />
));
TableBody.displayName = "TableBody";

export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ style, ...props }, ref) => (
  <tr
    ref={ref}
    style={{
      borderBottom: "1px solid #F4F4F5",
      transition: "background-color 0.15s ease",
      ...style,
    }}
    {...props}
  />
));
TableRow.displayName = "TableRow";

export const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ style, ...props }, ref) => (
  <th
    ref={ref}
    style={{
      padding: "12px 16px",
      fontWeight: 600,
      color: "#52525B",
      ...style,
    }}
    {...props}
  />
));
TableHead.displayName = "TableHead";

export const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ style, ...props }, ref) => (
  <td
    ref={ref}
    style={{
      padding: "14px 16px",
      color: "#18181B",
      verticalAlign: "middle",
      ...style,
    }}
    {...props}
  />
));
TableCell.displayName = "TableCell";
