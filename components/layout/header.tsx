'use client';

import { ReactNode } from 'react';

interface HeaderProps {
  title?: string;
  description?: string;
  children?: ReactNode;
  action?: ReactNode;
}

export function Header({ title, description, children, action }: HeaderProps) {
  return (
    <header className="mb-6 sm:mb-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          {title && (
            <h1 className="text-xl sm:text-2xl font-semibold text-foreground tracking-tight">
              {title}
            </h1>
          )}
          {description && (
            <p className="mt-1 text-sm sm:text-base text-foreground-secondary">
              {description}
            </p>
          )}
          {children}
        </div>
        {action && (
          <div className="flex items-center gap-3">
            {action}
          </div>
        )}
      </div>
    </header>
  );
}

// Breadcrumb component
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-foreground-secondary mb-4">
      {items.map((item, index) => (
        <span key={index} className="flex items-center gap-2">
          {index > 0 && <span>/</span>}
          {item.href ? (
            <a href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </a>
          ) : (
            <span className="text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
