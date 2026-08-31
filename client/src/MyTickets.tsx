import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useRequester } from "./RequesterContext.js";
import {
  fetchTickets,
  fetchCategories,
  type TicketListItem,
  type TicketListMeta,
  type Category,
  ApiError,
} from "./api.js";
import Button from "./components/Button.js";
import TicketTable from "./components/TicketTable.js";
import TicketCard from "./components/TicketCard.js";
import PaginationBar from "./components/PaginationBar.js";
import Spinner from "./components/Spinner.js";

type ListState = "loading" | "empty" | "no-results" | "error" | "idle";

interface Filters {
  search: string;
  categoryId: string;
  currentStatus: string;
  requestedPriority: string;
}

const EMPTY_FILTERS: Filters = {
  search: "",
  categoryId: "",
  currentStatus: "",
  requestedPriority: "",
};

const SORT_WHITELIST = [
  "updatedAt",
  "createdAt",
  "requestedPriority",
  "ticketNumber",
] as const;

export default function MyTickets() {
  const { requester } = useRequester();
  const navigate = useNavigate();

  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [meta, setMeta] = useState<TicketListMeta>({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [listState, setListState] = useState<ListState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(0);

  const requesterId = requester?.id;

  // Fetch categories once
  useEffect(() => {
    void fetchCategories()
      .then(setCategories)
      .catch(() => {
        // non-critical — filters just won't show category options
      });
  }, []);

  const loadTickets = useCallback(async () => {
    if (!requesterId) return;
    const reqId = ++abortRef.current;
    setListState("loading");
    setErrorMessage("");
    try {
      const params: Parameters<typeof fetchTickets>[0] = {
        requesterId,
        page,
        pageSize,
        sortBy,
        sortOrder,
      };
      if (filters.search) params.search = filters.search;
      if (filters.categoryId) params.categoryId = Number(filters.categoryId);
      if (filters.currentStatus) params.currentStatus = filters.currentStatus;
      if (filters.requestedPriority)
        params.requestedPriority = filters.requestedPriority;

      const result = await fetchTickets(params);
      if (reqId !== abortRef.current) return;
      setTickets(result.data);
      setMeta(result.meta);

      if (result.data.length === 0) {
        // Distinguish empty (no tickets at all) vs no-results (filters active)
        const hasFilters =
          filters.search ||
          filters.categoryId ||
          filters.currentStatus ||
          filters.requestedPriority;
        setListState(hasFilters ? "no-results" : "empty");
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
  }, [requesterId, page, pageSize, sortBy, sortOrder, filters]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  // Debounced search
  const handleSearchChange = (value: string) => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setFilters((f) => ({ ...f, search: value }));
      setPage(1);
    }, 300);
    // Update local input immediately
    setFilters((f) => ({ ...f, search: value }));
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
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

  const hasActiveFilters =
    filters.search ||
    filters.categoryId ||
    filters.currentStatus ||
    filters.requestedPriority;

  const handleRetry = () => {
    void loadTickets();
  };

  const handleRowClick = (_ticket: TicketListItem) => {
    // TODO(Issue 10): navigate to detail
  };

  return (
    <div className="container my-tickets">
      <div className="my-tickets-toolbar">
        <h1 className="page-title">My Tickets</h1>
        <Button
          variant="primary"
          onClick={() => navigate("/create-ticket")}
          data-testid="create-ticket-btn"
        >
          Create Ticket
        </Button>
      </div>

      <div className="filter-card" data-testid="filter-card">
        <div className="filter-row">
          <div className="filter-search">
            <label htmlFor="search-input" className="field-label">
              Search
            </label>
            <input
              id="search-input"
              type="text"
              className="field-input"
              placeholder="Search ticket number or summary"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              data-testid="search-input"
            />
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
            <label htmlFor="filter-status" className="field-label">
              Current Status
            </label>
            <select
              id="filter-status"
              className="field-select"
              value={filters.currentStatus}
              onChange={(e) =>
                handleFilterChange("currentStatus", e.target.value)
              }
              data-testid="filter-status"
            >
              <option value="">All</option>
              <option value="NEW">NEW</option>
            </select>
          </div>
          <div className="filter-select">
            <label htmlFor="filter-priority" className="field-label">
              Requested Priority
            </label>
            <select
              id="filter-priority"
              className="field-select"
              value={filters.requestedPriority}
              onChange={(e) =>
                handleFilterChange("requestedPriority", e.target.value)
              }
              data-testid="filter-priority"
            >
              <option value="">All</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
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

      {/* Mobile sort-by */}
      <div className="mobile-sort" data-testid="mobile-sort">
        <label htmlFor="mobile-sort-select" className="field-label">
          Sort by
        </label>
        <select
          id="mobile-sort-select"
          className="field-select"
          value={`${sortBy}:${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split(":");
            setSortBy(field);
            setSortOrder(order as "asc" | "desc");
            setPage(1);
          }}
          data-testid="mobile-sort-select"
        >
          <option value="updatedAt:desc">Last Updated (newest)</option>
          <option value="updatedAt:asc">Last Updated (oldest)</option>
          <option value="createdAt:desc">Created (newest)</option>
          <option value="createdAt:asc">Created (oldest)</option>
          <option value="ticketNumber:desc">Ticket Number (Z–A)</option>
          <option value="ticketNumber:asc">Ticket Number (A–Z)</option>
          <option value="requestedPriority:desc">
            Requested Priority (high to low)
          </option>
          <option value="requestedPriority:asc">
            Requested Priority (low to high)
          </option>
        </select>
      </div>

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
          <p>You haven&apos;t created any tickets yet.</p>
          <Button
            variant="primary"
            onClick={() => navigate("/create-ticket")}
          >
            Create Ticket
          </Button>
        </div>
      )}

      {listState === "no-results" && (
        <div className="list-state" data-testid="no-results-state">
          <p>No tickets match your filters.</p>
          <Button variant="secondary" onClick={clearFilters}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Ticket list */}
      {(listState === "idle" || listState === "error") && tickets.length > 0 && (
        <>
          <div className="ticket-table-desktop" data-testid="ticket-table-desktop">
            <TicketTable
              tickets={tickets}
              sort={{ sortBy, sortOrder }}
              onSort={handleSort}
              onRowClick={handleRowClick}
            />
          </div>
          <div className="ticket-cards-mobile" data-testid="ticket-cards-mobile">
            {tickets.map((t) => (
              <TicketCard key={t.id} ticket={t} onClick={handleRowClick} />
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
