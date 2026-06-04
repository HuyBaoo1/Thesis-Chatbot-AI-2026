import { useQuery } from "@tanstack/react-query"
import { startTransition, useEffect, useState } from "react"

import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"
import { getLeadActivities, getLeadScoreHistory } from "@/api/lead-api"
import { getStaffs } from "@/api/staff-api"
import LeadActivitiesDialog from "@/features/lead/components/lead-activities-dialog"
import LeadFormDialog from "@/features/lead/components/lead-form-dialog"
import LeadScoreHistoryDialog from "@/features/lead/components/lead-score-history-dialog"
import LeadTable from "@/features/lead/components/lead-table"
import LeadToolbar from "@/features/lead/components/lead-toolbar"
import useLead from "@/hooks/use-lead"
import useAuthStore from "@/stores/auth-store"
import type { Staff } from "@/types/staff-type"
import type {
  Lead,
  LeadListParams,
  LeadSortOption,
  LeadStatus,
  LeadTemperature,
  UpdateLeadPayload,
} from "@/types/lead-type"

const PAGE_SIZE = 4
const ACTIVITY_PAGE_SIZE = 3

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback

const LeadPage = () => {
  const { t } = useTranslation("leads")
  const currentUser = useAuthStore((state) => state.user)
  const isAdmin = currentUser?.role === "ADMIN"
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedLeadIdFromQuery = searchParams.get("leadId")

  const [searchInput, setSearchInput] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "ALL">("ALL")
  const [temperatureFilter, setTemperatureFilter] = useState<
    LeadTemperature | "ALL"
  >("ALL")
  const [sortOption, setSortOption] = useState<LeadSortOption>("newest")
  const [assignedStaffFilter, setAssignedStaffFilter] = useState<
    string | "ALL"
  >("ALL")
  const [offset, setOffset] = useState(0)
  const [activitiesDialogOpen, setActivitiesDialogOpen] = useState(false)
  const [scoreHistoryDialogOpen, setScoreHistoryDialogOpen] = useState(false)
  const [activityLead, setActivityLead] = useState<Lead | null>(null)
  const [scoreHistoryLead, setScoreHistoryLead] = useState<Lead | null>(null)
  const [activityOffset, setActivityOffset] = useState(0)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const dialogOpen = Boolean(selectedLeadIdFromQuery)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      startTransition(() => {
        setOffset(0)
        setAppliedSearch(searchInput.trim())
      })
    }, 1000)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  const staffQuery = useQuery({
    queryKey: ["lead-staff-options"],
    queryFn: () => getStaffs({ limit: 100, offset: 0, role: "COUNSELOR" }),
    enabled: isAdmin,
    staleTime: 60_000,
  })

  const staffItems: Staff[] = staffQuery.data?.items ?? []
  const staffOptions = staffItems.map((staff) => ({
    label: staff.name,
    value: staff.id,
  }))

  const staffNameById = Object.fromEntries(
    staffItems.map((staff) => [staff.id, staff.name])
  ) as Record<string, string>

  const params: LeadListParams = {
    limit: PAGE_SIZE,
    offset,
    q: appliedSearch || undefined,
    status: statusFilter === "ALL" ? undefined : statusFilter,
    temperature: temperatureFilter === "ALL" ? undefined : temperatureFilter,
    assigned_staff_id:
      assignedStaffFilter === "ALL" ? undefined : assignedStaffFilter,
    score_sort:
      sortOption === "score_desc"
        ? "desc"
        : sortOption === "score_asc"
          ? "asc"
          : undefined,
  }

  const {
    activeLeadId,
    leadList,
    leadListPending,
    leadListFetching,
    leadListError,
    leadDetail,
    leadDetailPending,
    leadDetailFetching,
    leadDetailError,
    leadInterests,
    leadInterestsPending,
    leadApplications,
    leadApplicationsPending,
    updateLead,
    updateLeadPending,
  } = useLead({
    params,
    leadId: selectedLeadIdFromQuery,
  })

  const items = leadList?.items ?? []
  const total = leadList?.total ?? 0

  const leadActivitiesQuery = useQuery({
    queryKey: [
      "lead",
      activityLead?.id,
      "activities",
      activityOffset,
      ACTIVITY_PAGE_SIZE,
    ],
    queryFn: () =>
      getLeadActivities(activityLead?.id as string, {
        limit: ACTIVITY_PAGE_SIZE,
        offset: activityOffset,
      }),
    enabled: Boolean(activityLead?.id) && activitiesDialogOpen,
    placeholderData: (previousData) => previousData,
  })

  const leadScoreHistoryQuery = useQuery({
    queryKey: ["lead", scoreHistoryLead?.id, "score-history"],
    queryFn: () => getLeadScoreHistory(scoreHistoryLead?.id as string),
    enabled: Boolean(scoreHistoryLead?.id) && scoreHistoryDialogOpen,
    placeholderData: (previousData) => previousData,
  })

  const handleSelectLead = (lead: Lead) => {
    setActionError(null)
    setActionSuccess(null)
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams)
      nextParams.set("leadId", lead.id)
      return nextParams
    })
  }

  const handleSaveLead = async (values: UpdateLeadPayload) => {
    if (!activeLeadId) return

    setActionError(null)
    setActionSuccess(null)

    try {
      await updateLead({
        leadId: activeLeadId,
        values,
      })
      setActionSuccess(t("updateSuccess"))
    } catch (error) {
      setActionError(getErrorMessage(error, t("updateError")))
    }
  }

  const handleOpenActivities = (lead: Lead) => {
    setActivityLead(lead)
    setActivityOffset(0)
    setActivitiesDialogOpen(true)
  }

  const handleOpenScoreHistory = (lead: Lead) => {
    setScoreHistoryLead(lead)
    setScoreHistoryDialogOpen(true)
  }

  const handleClearFilters = () => {
    setSearchInput("")
    setAppliedSearch("")
    setStatusFilter("ALL")
    setTemperatureFilter("ALL")
    setSortOption("newest")
    setAssignedStaffFilter("ALL")
    setOffset(0)
  }

  const surfaceError =
    actionError ||
    getErrorMessage(leadListError, "") ||
    getErrorMessage(leadDetailError, "")

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-500">{t("description")}</p>
      </div>

      <LeadToolbar
        searchInput={searchInput}
        appliedSearch={appliedSearch}
        statusFilter={statusFilter}
        temperatureFilter={temperatureFilter}
        sortOption={sortOption}
        assignedStaffFilter={assignedStaffFilter}
        staffOptions={staffOptions}
        onSearchInputChange={setSearchInput}
        onStatusFilterChange={(value) => {
          setStatusFilter(value)
          setOffset(0)
        }}
        onTemperatureFilterChange={(value) => {
          setTemperatureFilter(value)
          setOffset(0)
        }}
        onSortOptionChange={(value) => {
          setSortOption(value)
          setOffset(0)
        }}
        onAssignedStaffFilterChange={(value) => {
          setAssignedStaffFilter(value)
          setOffset(0)
        }}
        onClearFilters={handleClearFilters}
      />

      {surfaceError ? (
        <div className="rounded-2xl border border-red-100 bg-red-50/80 px-4 py-3 text-sm text-red-600">
          {surfaceError}
        </div>
      ) : null}

      {actionSuccess ? (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700">
          {actionSuccess}
        </div>
      ) : null}

      <LeadTable
        items={items}
        total={total}
        limit={PAGE_SIZE}
        offset={offset}
        selectedLeadId={dialogOpen ? activeLeadId : null}
        staffNameById={staffNameById}
        isLoading={leadListPending}
        isFetching={leadListFetching}
        onPageChange={(page) => setOffset((page - 1) * PAGE_SIZE)}
        onSelect={handleSelectLead}
        onOpenActivities={handleOpenActivities}
        onOpenScoreHistory={handleOpenScoreHistory}
      />

      <LeadFormDialog
        open={dialogOpen}
        lead={leadDetail}
        leadPending={leadDetailPending}
        leadFetching={leadDetailFetching}
        interests={leadInterests?.items ?? []}
        interestsPending={leadInterestsPending}
        applications={leadApplications?.items ?? []}
        applicationsPending={leadApplicationsPending}
        savePending={updateLeadPending}
        errorMessage={actionError}
        onOpenChange={(open) => {
          if (!open) {
            setActionError(null)
            setActionSuccess(null)
            setSearchParams((currentParams) => {
              const nextParams = new URLSearchParams(currentParams)
              nextParams.delete("leadId")
              return nextParams
            })
          }
        }}
        onSave={handleSaveLead}
      />

      <LeadActivitiesDialog
        open={activitiesDialogOpen}
        lead={activityLead}
        activities={leadActivitiesQuery.data?.items ?? []}
        total={leadActivitiesQuery.data?.total ?? 0}
        limit={ACTIVITY_PAGE_SIZE}
        offset={activityOffset}
        isLoading={leadActivitiesQuery.isLoading}
        isFetching={leadActivitiesQuery.isFetching}
        onOpenChange={(open) => {
          setActivitiesDialogOpen(open)
          if (!open) {
            setActivityLead(null)
            setActivityOffset(0)
          }
        }}
        onPageChange={(page) => {
          setActivityOffset((page - 1) * ACTIVITY_PAGE_SIZE)
        }}
      />

      <LeadScoreHistoryDialog
        open={scoreHistoryDialogOpen}
        lead={scoreHistoryLead}
        history={leadScoreHistoryQuery.data}
        isLoading={leadScoreHistoryQuery.isLoading}
        isFetching={leadScoreHistoryQuery.isFetching}
        onOpenChange={(open) => {
          setScoreHistoryDialogOpen(open)
          if (!open) {
            setScoreHistoryLead(null)
          }
        }}
      />
    </div>
  )
}

export default LeadPage
