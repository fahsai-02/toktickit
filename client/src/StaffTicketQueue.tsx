import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, SearchX, SlidersHorizontal } from "lucide-react";
import { useAuth } from "./AuthContext.js";
import {
  fetchStaffTickets,
  fetchCategories,
  type StaffTicketListItem,
  type TicketListMeta,
  type Category,
  ApiError,
} from "./api.js";
import Button from "./components/Button.js";
import TicketTable, { type TicketRow } from "./components/TicketTable.js";
import TicketCard from "./components/TicketCard.js";
import PaginationBar from "./components/PaginationBar.js";
import Spinner from "./components/Spinner.js";
import MobileSortSelect from "./components/MobileSortSelect.js";
import { TICKET_STATUSES, PRIORITY_OPTIONS } from "./lib/options.js";

type ListState = "loading" | "empty" | "no-results" | "error" | "idle";

interface Filters {
  search: string;
  status: string;
  requestedPriority: string;
  itPriority: string;
  categoryId: string;
  ownerId: string;
}

const EMPTY_FILTERS: Filters = {
  search: "",
  status: "",
  requestedPriority: "",
  itPriority: "",
  categoryId: "",
  ownerId: "",
};

// Mirrors api-spec section 5.1: staff queue sorting is limited to these 5
// fields. `requestedPriority` is deliberately absent (server 400s on it).
const SORT_WHITELIST = [
  "updatedAt",
  "createdAt",
  "itPriority",
  "currentStatus",
  "ticketNumber",
] as const;

const STAFF_ROLES = ["IT_STAFF", "ADMINISTRATOR"] as const;

// Explicit markup for the shared MobileSortSelect. Mirrors SORT_WHITELIST —
// `requestedPriority` is intentionally absent (server 400s on it), staff gets
// `itPriority` + `currentStatus` instead.
const STAFF_MOBILE_SORT_OPTIONS = [
  { value: "updatedAt:desc", label: "Last Updated (newest)" },
  { value: "updatedAt:asc", label: "Last Updated (oldest)" },
  { value: "createdAt:desc", label: "Created (newest)" },
  { value: "createdAt:asc", label: "Created (oldest)" },
  { value: "ticketNumber:desc", label: "Ticket Number (Z–A)" },
  { value: "ticketNumber:asc", label: "Ticket Number (A–Z)" },
  { value: "itPriority:desc", label: "IT Priority (high to low)" },
  { value: "itPriority:asc", label: "IT Priority (low to high)" },
  { value: "currentStatus:desc", label: "Status (Z–A)" },
  { value: "currentStatus:asc", label: "Status (A–Z)" },
];

export default function StaffTicketQueue() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ui-spec 5.4: non-IT-Staff/Admin must never see queue data. This gates the
  // fetch effect below too, so a forbidden visitor doesn't even fire a
  // /api/staff/tickets request (defense-in-depth behind the route guard).
  const isStaff =
    user != null && (STAFF_ROLES as readonly string[]).includes(user.role);

  const [tickets, setTickets] = useState<StaffTicketListItem[]>([]);
  const [meta, setMeta] = useState<TicketListMeta>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [listState, setListState] = useState<ListState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchInput, setSearchInput] = useState("");

  const hasActiveFilters =
    filters.search ||
    filters.categoryId ||
    filters.status ||
    filters.requestedPriority ||
    filters.itPriority ||
    filters.ownerId;

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(0);

  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  useEffect(() => {
    void fetchCategories()
      .then(setCategories)
      .catch(() => {
        // non-critical — filters just won't show category options
      });
  }, []);

  const loadTickets = useCallback(async () => {
    const reqId = ++abortRef.current;
    setListState("loading");
    setErrorMessage("");
    try {
      const params: Parameters<typeof fetchStaffTickets>[0] = {
        page,
        pageSize,
        sortBy,
        sortOrder,
      };
      if (filters.search) params.search = filters.search;
      if (filters.categoryId) params.categoryId = Number(filters.categoryId);
      if (filters.status) params.currentStatus = filters.status;
      if (filters.requestedPriority) params.requestedPriority = filters.requestedPriority;
      if (filters.itPriority) params.itPriority = filters.itPriority;
      if (filters.ownerId) params.ownerId = filters.ownerId;

      const result = await fetchStaffTickets(params);
      if (reqId !== abortRef.current) return;
      setTickets(result.data);
      setMeta(result.meta);

      if (result.data.length === 0) {
        setListState(hasActiveFilters ? "no-results" : "empty");
      } else {
        setListState("idle");
      }
    } catch (err) {
      if (reqId !== abortRef.current) return;
      if (err instanceof ApiError) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("An unexpected error occurred.");
      }
      setListState("error");
    }
  }, [page, pageSize, sortBy, sortOrder, filters]);

  useEffect(() => {
    if (!isStaff) return;
    void loadTickets();
  }, [loadTickets, isStaff]);

  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: value }));
      setPage(1);
    }, 300);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    setSearchInput("");
    setFilters(EMPTY_FILTERS);
    setPage(1);
  };

  const handleSort = (field: string) => {
    if (!SORT_WHITELIST.includes(field as typeof SORT_WHITELIST[number])) return;
    if (sortBy === field) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  };

  // ui-spec 5.4: a non-staff caller who somehow reaches the queue sees a
  // forbidden state, never the ticket data itself.
  if (user && !isStaff) {
    return (
      <div className="list-state" data-testid="forbidden-state">
        <p>You don&apos;t have access to this page.</p>
      </div>
    );
  }
  if (!user) return null;

  const start = meta.total === 0 ? 0 : (meta.page - 1) * meta.pageSize + 1;
  const end = meta.total === 0 ? 0 : Math.min(meta.page * meta.pageSize, meta.total);

  const handleRowClick = (ticket: TicketRow | StaffTicketListItem) => {
    navigate(`/staff/tickets/${ticket.id}`);
  };

  const handleRetry = () => {
    void loadTickets();
  };

  return (
    <div className="container my-tickets" data-testid="staff-queue-page">
      <div className="my-tickets-toolbar">
        <h1 className="page-title">My Queue</h1>
      </div>

      <div className="queue-toolbar">
        <div className="filter-search">
          <label htmlFor="staff-search-input" className="field-label">
            Search
          </label>
          <input
            id="staff-search-input"
            type="text"
            className="field-input"
            placeholder="Search by ticket number or summary..."
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            data-testid="staff-search-input"
          />
        </div>
        <Button
          variant="secondary"
          onClick={() => setFiltersOpen((v) => !v)}
          data-testid="filters-toggle"
          aria-expanded={filtersOpen}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters
        </Button>
      </div>

      {filtersOpen && (
        <div className="filter-card" data-testid="filter-card">
          <div className="filter-row">
            <div className="filter-select">
              <label htmlFor="filter-status" className="field-label">
                Status
              </label>
              <select
                id="filter-status"
                className="field-select"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                data-testid="filter-status"
              >
                <option value="">All</option>
                {TICKET_STATUSES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-select">
              <label htmlFor="filter-req-priority" className="field-label">
                Req. Priority
              </label>
              <select
                id="filter-req-priority"
                className="field-select"
                value={filters.requestedPriority}
                onChange={(e) =>
                  handleFilterChange("requestedPriority", e.target.value)
                }
                data-testid="filter-req-priority"
              >
                <option value="">All</option>
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-select">
              <label htmlFor="filter-it-priority" className="field-label">
                IT Priority
              </label>
              <select
                id="filter-it-priority"
                className="field-select"
                value={filters.itPriority}
                onChange={(e) => handleFilterChange("itPriority", e.target.value)}
                data-testid="filter-it-priority"
              >
                <option value="">All</option>
                {PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-select">
              <label htmlFor="filter-category" className="field-label">
                Category
              </label>
              <select
                id="filter-category"
                className="field-select"
                value={filters.categoryId}
                onChange={(e) => handleFilterChange("categoryId", e.target.value)}
                data-testid="filter-category"
              >
                <option value="">All</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="filter-select">
              <label htmlFor="filter-owner" className="field-label">
                Owner
              </label>
              <select
                id="filter-owner"
                className="field-select"
                value={filters.ownerId}
                onChange={(e) => handleFilterChange("ownerId", e.target.value)}
                data-testid="filter-owner"
              >
                <option value="">All</option>
                <option value="unassigned">Unassigned</option>
                <option value="me">Assigned to me</option>
              </select>
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                data-testid="clear-filters"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Results count (ui-spec 5.4) */}
      {listState === "idle" && meta.total > 0 && (
        <p className="queue-results-count" data-testid="results-count">
          Showing {start} to {end} of {meta.total} tickets
        </p>
      )}

      {/* Mobile sort-by */}
      <MobileSortSelect
        sortBy={sortBy}
        sortOrder={sortOrder}
        options={STAFF_MOBILE_SORT_OPTIONS}
        onChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
          setPage(1);
        }}
      />

      {/* Content states */}
      {listState === "loading" && (
        <div className="list-state" data-testid="loading-state">
          <Spinner />
          <span>Loading tickets...</span>
        </div>
      )}

      {listState === "error" && (
        <div className="list-state list-state--error" data-testid="error-state">
          <p className="error-banner">{errorMessage}</p>
          <Button variant="secondary" onClick={handleRetry} data-testid="retry-btn">
            Retry
          </Button>
        </div>
      )}

      {listState === "empty" && (
        <div className="list-state" data-testid="empty-state">
          <Inbox size={48} strokeWidth={1.5} />
          <p>No tickets found.</p>
        </div>
      )}

      {listState === "no-results" && (
        <div className="list-state" data-testid="no-results-state">
          <SearchX size={48} strokeWidth={1.5} />
          <p>No results match your search.</p>
          <Button variant="secondary" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Queue list */}
      {(listState === "idle" || listState === "error") && tickets.length > 0 && (
        <>
          <div
            className="staff-table-desktop"
            data-testid="staff-table-desktop"
          >
            <TicketTable
              tickets={tickets}
              sort={{ sortBy, sortOrder }}
              onSort={handleSort}
              onRowClick={handleRowClick}
              variant="staff"
            />
          </div>
          <div className="staff-cards-mobile" data-testid="staff-cards-mobile">
            {tickets.map((t) => (
              <TicketCard key={t.id} ticket={t} onClick={handleRowClick} variant="staff" />
            ))}
          </div>
        </>
      )}

      {/* Pagination */}
      {listState !== "loading" && meta.total > 0 && (
        <PaginationBar
          page={meta.page}
          pageSize={meta.pageSize}
          total={meta.total}
          totalPages={meta.totalPages}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}