import { startTransition, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import MajorDeleteDialog from "@/features/major/components/major-delete-dialog"
import MajorFormDialog from "@/features/major/components/major-form-dialog"
import MajorTable from "@/features/major/components/major-table"
import MajorToolbar from "@/features/major/components/major-toolbar"
import useMajor from "@/hooks/use-major"
import { canManageManagedContent } from "@/lib/permissions"
import type { MajorFormValues } from "@/schemas/major-schema"
import useAuthStore from "@/stores/auth-store"
import type { Major, MajorListParams, MajorType } from "@/types/major-type"

const PAGE_SIZE = 3

const MajorPage = () => {
  const { t } = useTranslation("major")
  const { t: tc } = useTranslation("common")
  const userRole = useAuthStore((state) => state.user?.role)
  const canManage = canManageManagedContent(userRole)
  const [searchInput, setSearchInput] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [majorTypeFilter, setMajorTypeFilter] = useState<MajorType | "ALL">(
    "ALL"
  )
  const [offset, setOffset] = useState(0)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null)
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [majorToDelete, setMajorToDelete] = useState<Major | null>(null)
  const [togglingMajorId, setTogglingMajorId] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setOffset(0)
        setAppliedSearch(searchInput.trim())
      })
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const params: MajorListParams = {
    limit: PAGE_SIZE,
    offset,
    q: appliedSearch || undefined,
    major_type: majorTypeFilter === "ALL" ? undefined : majorTypeFilter,
  }

  const {
    majorList,
    majorListPending,
    majorListFetching,
    createMajor: createMajorAction,
    createMajorPending,
    updateMajor: updateMajorAction,
    updateMajorPending,
    updateMajorStatus: updateMajorStatusAction,
    deleteMajor: deleteMajorAction,
    deleteMajorPending,
  } = useMajor(params)

  const total = majorList?.total ?? 0
  const items = majorList?.items ?? []

  const handleCreateClick = () => {
    if (!canManage) return
    setDialogMode("create")
    setSelectedMajor(null)
    setDialogError(null)
    setActionSuccess(null)
    setDialogOpen(true)
  }

  const handleEditClick = (major: Major) => {
    if (!canManage) return
    setDialogMode("edit")
    setSelectedMajor(major)
    setDialogError(null)
    setActionSuccess(null)
    setDialogOpen(true)
  }

  const handleDialogSubmit = async (values: MajorFormValues) => {
    if (!canManage) return
    setDialogError(null)

    const payload = {
      code: values.code,
      name: values.name,
      description: values.description,
      credits: values.credits,
      duration: values.duration,
      degree_type: values.degree_type,
      major_type: values.major_type,
    }

    try {
      if (dialogMode === "create") {
        await createMajorAction({ ...payload, is_active: true })
        setDialogOpen(false)
        setActionSuccess(t("createSuccess"))
        return
      }

      if (!selectedMajor) return

      await updateMajorAction({ majorId: selectedMajor.id, values: payload })
      setDialogOpen(false)
      setSelectedMajor(null)
      setActionSuccess(t("updateSuccess"))
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : tc("error"))
    }
  }

  const handleToggleStatus = async (major: Major) => {
    if (!canManage) return
    setTogglingMajorId(major.id)
    setActionError(null)
    setActionSuccess(null)

    try {
      await updateMajorStatusAction({
        majorId: major.id,
        is_active: !major.is_active,
      })
      setActionSuccess(t(!major.is_active ? "toggleActive" : "toggleInactive"))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : tc("error"))
    } finally {
      setTogglingMajorId(null)
    }
  }

  const handleDeleteClick = (major: Major) => {
    if (!canManage) return
    setMajorToDelete(major)
    setActionSuccess(null)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!canManage || !majorToDelete) return

    try {
      await deleteMajorAction(majorToDelete.id)
      if (items.length === 1 && offset > 0) {
        setOffset(Math.max(0, offset - PAGE_SIZE))
      }
      setDeleteDialogOpen(false)
      setMajorToDelete(null)
      setActionError(null)
      setActionSuccess(t("deleteSuccess"))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : tc("error"))
    }
  }

  const handleClearFilters = () => {
    setSearchInput("")
    setAppliedSearch("")
    setMajorTypeFilter("ALL")
    setOffset(0)
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-950">
          {t("title")}
        </h1>
        <p className="text-sm text-slate-500">{t("description")}</p>
      </div>

      <MajorToolbar
        canManage={canManage}
        searchInput={searchInput}
        appliedSearch={appliedSearch}
        majorTypeFilter={majorTypeFilter}
        onSearchInputChange={setSearchInput}
        onMajorTypeFilterChange={(value) => {
          setMajorTypeFilter(value)
          setOffset(0)
        }}
        onCreateClick={handleCreateClick}
        onClearFilters={handleClearFilters}
      />

      {actionError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-600">
          {actionError}
        </div>
      ) : null}

      {actionSuccess ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
          {actionSuccess}
        </div>
      ) : null}

      <MajorTable
        canManage={canManage}
        items={items}
        total={total}
        limit={PAGE_SIZE}
        offset={offset}
        isLoading={majorListPending}
        isFetching={majorListFetching}
        togglingMajorId={togglingMajorId}
        onPageChange={(page) => setOffset((page - 1) * PAGE_SIZE)}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onToggleStatus={handleToggleStatus}
      />

      {canManage ? (
        <>
          <MajorFormDialog
            open={dialogOpen}
            mode={dialogMode}
            major={selectedMajor}
            errorMessage={dialogError}
            isSubmitting={createMajorPending || updateMajorPending}
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) {
                setDialogError(null)
                setSelectedMajor(null)
              }
            }}
            onSubmit={handleDialogSubmit}
          />

          <MajorDeleteDialog
            open={deleteDialogOpen}
            major={majorToDelete}
            isDeleting={deleteMajorPending}
            onOpenChange={(open) => {
              setDeleteDialogOpen(open)
              if (!open) setMajorToDelete(null)
            }}
            onConfirm={handleConfirmDelete}
          />
        </>
      ) : null}
    </div>
  )
}

export default MajorPage
