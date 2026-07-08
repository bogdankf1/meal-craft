"use client";

import { useState } from "react";

interface UseArchivableListStateOptions<TFilters> {
  /** Base filters shared by the active and archived lists (without `is_archived`). */
  initialFilters: TFilters;
}

/**
 * Owns the state/handlers duplicated across the archivable dashboard modules
 * (groceries, pantry, restaurants, shopping-lists, …): the active/archived
 * filter pairs, form/bulk-form dialogs, the item being edited, the history
 * range and the table/calendar view toggles.
 *
 * Kept i18n- and currency-free on purpose; callers own their translations,
 * queries, module-specific dialogs and JSX.
 */
export function useArchivableListState<
  TFilters extends { page?: number; is_archived?: boolean },
  TItem,
>({ initialFilters }: UseArchivableListStateOptions<TFilters>) {
  // State for active items
  const [filters, setFilters] = useState<TFilters>({
    ...initialFilters,
    is_archived: false,
  } as TFilters);

  // State for archived items
  const [archiveFilters, setArchiveFilters] = useState<TFilters>({
    ...initialFilters,
    is_archived: true,
  } as TFilters);

  const [formOpen, setFormOpen] = useState(false);
  const [bulkFormOpen, setBulkFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TItem | null>(null);
  const [historyMonths, setHistoryMonths] = useState(3);
  const [currentView, setCurrentView] = useState<string>("table");
  const [archiveView, setArchiveView] = useState<string>("table");

  const handleAddClick = () => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEditClick = (item: TItem) => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handlePageChange = (page: number) => {
    setFilters({ ...filters, page } as TFilters);
  };

  const handleArchivePageChange = (page: number) => {
    setArchiveFilters({ ...archiveFilters, page } as TFilters);
  };

  return {
    filters,
    setFilters,
    archiveFilters,
    setArchiveFilters,
    formOpen,
    setFormOpen,
    bulkFormOpen,
    setBulkFormOpen,
    editingItem,
    setEditingItem,
    historyMonths,
    setHistoryMonths,
    currentView,
    setCurrentView,
    archiveView,
    setArchiveView,
    handleAddClick,
    handleEditClick,
    handlePageChange,
    handleArchivePageChange,
  };
}
