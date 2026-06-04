import { startTransition, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import TuitionPolicyDeleteDialog from "@/features/tuition-policy/components/tuition-policy-delete-dialog"
import TuitionPolicyFormDialog from "@/features/tuition-policy/components/tuition-policy-form-dialog"
import TuitionPolicyTable from "@/features/tuition-policy/components/tuition-policy-table"
import TuitionPolicyToolbar from "@/features/tuition-policy/components/tuition-policy-toolbar"
import useTuitionPolicy from "@/hooks/use-tuition-policy"
import { canManageManagedContent } from "@/lib/permissions"
import type { TuitionPolicyFormValues } from "@/schemas/tuition-policy-schema"
import useAuthStore from "@/stores/auth-store"
import type {
  FeeType,
  TuitionPolicy,
  TuitionPolicyListParams,
} from "@/types/tuition-policy-type"

const PAGE_SIZE = 4

const TuitionPolicyPage = () => {
  const { t } = useTranslation("tuition-policy")
  const userRole = useAuthStore((state) => state.user?.role)
  const canManage = canManageManagedContent(userRole)
  const [yearInput, setYearInput] = useState("")
  const [appliedYear, setAppliedYear] = useState<number | undefined>(undefined)
  const [majorFilter, setMajorFilter] = useState("ALL")
  const [feeTypeFilter, setFeeTypeFilter] = useState<FeeType | "ALL">("ALL")
  const [offset, setOffset] = useState(0)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create")
  const [selectedPolicy, setSelectedPolicy] = useState<TuitionPolicy | null>(
    null
  )
  const [dialogError, setDialogError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [policyToDelete, setPolicyToDelete] = useState<TuitionPolicy | null>(
    null
  )
  const [togglingPolicyId, setTogglingPolicyId] = useState<string | null>(null)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setOffset(0)
        const trimmedYear = yearInput.trim()
        if (!trimmedYear) {
          setAppliedYear(undefined)
          return
        }

        const nextYear = Number(trimmedYear)
        setAppliedYear(Number.isInteger(nextYear) ? nextYear : undefined)
      })
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [yearInput])

  const params: TuitionPolicyListParams = {
    limit: PAGE_SIZE,
    offset,
    year: appliedYear,
    major_id: majorFilter === "ALL" ? undefined : majorFilter,
    fee_type: feeTypeFilter === "ALL" ? undefined : feeTypeFilter,
  }

  const {
    tuitionPolicyList,
    tuitionPolicyListPending,
    tuitionPolicyListFetching,
    majorOptions,
    majorOptionsPending,
    createTuitionPolicy: createTuitionPolicyAction,
    createTuitionPolicyPending,
    updateTuitionPolicy: updateTuitionPolicyAction,
    updateTuitionPolicyPending,
    updateTuitionPolicyStatus: updateTuitionPolicyStatusAction,
    deleteTuitionPolicy: deleteTuitionPolicyAction,
    deleteTuitionPolicyPending,
  } = useTuitionPolicy(params)

  const total = tuitionPolicyList?.total ?? 0
  const items = tuitionPolicyList?.items ?? []

  const majorNameById = useMemo(
    () =>
      Object.fromEntries(
        majorOptions.map((major) => [major.id, `${major.code} - ${major.name}`])
      ) as Record<string, string>,
    [majorOptions]
  )

  const handleCreateClick = () => {
    if (!canManage) return
    setDialogMode("create")
    setSelectedPolicy(null)
    setDialogError(null)
    setActionSuccess(null)
    setDialogOpen(true)
  }

  const handleEditClick = (policy: TuitionPolicy) => {
    if (!canManage) return
    setDialogMode("edit")
    setSelectedPolicy(policy)
    setDialogError(null)
    setActionSuccess(null)
    setDialogOpen(true)
  }

  const handleDialogSubmit = async (values: TuitionPolicyFormValues) => {
    if (!canManage) return
    setDialogError(null)

    const payload = {
      major_id: values.major_id,
      year: values.year,
      fee_type: values.fee_type,
      base_fee: values.base_fee,
    }

    try {
      if (dialogMode === "create") {
        await createTuitionPolicyAction({ ...payload, is_active: true })
        setDialogOpen(false)
        setActionSuccess(t("createSuccess"))
        return
      }

      if (!selectedPolicy) return

      await updateTuitionPolicyAction({
        policyId: selectedPolicy.id,
        values: payload,
      })
      setDialogOpen(false)
      setSelectedPolicy(null)
      setActionSuccess(t("updateSuccess"))
    } catch (error) {
      setDialogError(
        error instanceof Error ? error.message : t("genericError")
      )
    }
  }

  const handleToggleStatus = async (policy: TuitionPolicy) => {
    if (!canManage) return
    setTogglingPolicyId(policy.id)
    setActionError(null)
    setActionSuccess(null)

    try {
      await updateTuitionPolicyStatusAction({
        policyId: policy.id,
        is_active: !policy.is_active,
      })
      setActionSuccess(
        !policy.is_active ? t("toggleActive") : t("toggleInactive")
      )
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("genericError")
      )
    } finally {
      setTogglingPolicyId(null)
    }
  }

  const handleDeleteClick = (policy: TuitionPolicy) => {
    if (!canManage) return
    setPolicyToDelete(policy)
    setActionSuccess(null)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!canManage || !policyToDelete) return

    try {
      await deleteTuitionPolicyAction(policyToDelete.id)
      if (items.length === 1 && offset > 0) {
        setOffset(Math.max(0, offset - PAGE_SIZE))
      }
      setDeleteDialogOpen(false)
      setPolicyToDelete(null)
      setActionError(null)
      setActionSuccess(t("deleteSuccess"))
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : t("genericError")
      )
    }
  }

  const handleClearFilters = () => {
    setYearInput("")
    setAppliedYear(undefined)
    setMajorFilter("ALL")
    setFeeTypeFilter("ALL")
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

      <TuitionPolicyToolbar
        canManage={canManage}
        yearInput={yearInput}
        appliedYear={appliedYear}
        majorFilter={majorFilter}
        feeTypeFilter={feeTypeFilter}
        majorOptions={majorOptions}
        onYearInputChange={setYearInput}
        onMajorFilterChange={(value) => {
          setMajorFilter(value)
          setOffset(0)
        }}
        onFeeTypeFilterChange={(value) => {
          setFeeTypeFilter(value)
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

      <TuitionPolicyTable
        canManage={canManage}
        items={items}
        total={total}
        limit={PAGE_SIZE}
        offset={offset}
        majorNameById={majorNameById}
        isLoading={tuitionPolicyListPending}
        isFetching={tuitionPolicyListFetching}
        togglingPolicyId={togglingPolicyId}
        onPageChange={(page) => setOffset((page - 1) * PAGE_SIZE)}
        onEdit={handleEditClick}
        onDelete={handleDeleteClick}
        onToggleStatus={handleToggleStatus}
      />

      {canManage ? (
        <>
          <TuitionPolicyFormDialog
            open={dialogOpen}
            mode={dialogMode}
            policy={selectedPolicy}
            majorOptions={majorOptions}
            majorOptionsPending={majorOptionsPending}
            errorMessage={dialogError}
            isSubmitting={
              createTuitionPolicyPending || updateTuitionPolicyPending
            }
            onOpenChange={(open) => {
              setDialogOpen(open)
              if (!open) {
                setDialogError(null)
                setSelectedPolicy(null)
              }
            }}
            onSubmit={handleDialogSubmit}
          />

          <TuitionPolicyDeleteDialog
            open={deleteDialogOpen}
            policy={policyToDelete}
            majorName={
              policyToDelete ? majorNameById[policyToDelete.major_id] : undefined
            }
            isDeleting={deleteTuitionPolicyPending}
            onOpenChange={(open) => {
              setDeleteDialogOpen(open)
              if (!open) setPolicyToDelete(null)
            }}
            onConfirm={handleConfirmDelete}
          />
        </>
      ) : null}
    </div>
  )
}

export default TuitionPolicyPage
