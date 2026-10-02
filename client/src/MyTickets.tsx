import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Inbox, SearchX } from "lucide-react";
import { useAuth } from "./AuthContext.js";
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
import TextField from "./components/TextField.js";
import SelectField from "./components/SelectField.js";
import ListState from "./components/ListState.js";
import MobileSortSelect from "./components/MobileSortSelect.js";
import { TICKET_STATUSES, PRIORITY_OPTIONS } from "./lib/options.js";

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

const MOBILE_SORT_OPTIONS = [
  { value: "updatedAt:desc", label: "Last Updated (newest)" },
  { value: "updatedAt:asc", label: "Last Updated (oldest)" },
  { value: "createdAt:desc", label: "Created (newest)" },
  { value: "createdAt:asc", label: "Created (oldest)" },
  { value: "ticketNumber:desc", label: "Ticket Number (Z–A)" },
  { value: "ticketNumber:asc", label: "Ticket Number (A–Z)" },
  { value: "requestedPriority:desc", label: "Requested Priority (high to low)" },
  { value: "requestedPriority:asc", label: "Requested Priority (low to high)" },
];

export default function MyTickets() {
  const { user } = useAuth();
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
  const [searchInput, setSearchInput] = useState("");

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(0);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, []);

  // Fetch categories once
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
      const params: Parameters<typeof fetchTickets>[0] = {
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
  }, [page, pageSize, sortBy, sortOrder, filters]);

  useEffect(() => {
    void loadTickets();
  }, [loadTickets]);

  // Debounced search
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

  const hasActiveFilters =
    filters.search ||
    filters.categoryId ||
    filters.currentStatus ||
    filters.requestedPriority;

  const handleRetry = () => {
    void loadTickets();
  };

  const handleRowClick = (ticket: TicketListItem) => {
    navigate(`/tickets/${ticket.id}`);
  };

  if (!user) return null;

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
          <TextField
            id="search-input"
            label="Search"
            className="filter-search"
            placeholder="Search ticket number or summary"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            data-testid="search-input"
          />
          <SelectField
            id="filter-category"
            label="Category"
            className="filter-select"
            placeholder="All"
            value={filters.categoryId}
            onChange={(e) => handleFilterChange("categoryId", e.target.value)}
            data-testid="filter-category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <SelectField
            id="filter-status"
            label="Current Status"
            className="filter-select"
            placeholder="All"
            value={filters.currentStatus}
            onChange={(e) => handleFilterChange("currentStatus", e.target.value)}
            data-testid="filter-status"
            options={TICKET_STATUSES}
          />
          <SelectField
            id="filter-priority"
            label="Priority"
            className="filter-select"
            placeholder="All"
            value={filters.requestedPriority}
            onChange={(e) =>
              handleFilterChange("requestedPriority", e.target.value)
            }
            data-testid="filter-priority"
            options={PRIORITY_OPTIONS}
          />
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
      <MobileSortSelect
        sortBy={sortBy}
        sortOrder={sortOrder}
        options={MOBILE_SORT_OPTIONS}
        onChange={(field, order) => {
          setSortBy(field);
          setSortOrder(order);
          setPage(1);
        }}
      />

      {/* Content states */}
      {listState === "loading" && (
        <ListState testId="loading-state" loading message="Loading tickets..." />
      )}

      {listState === "error" && (
        <ListState
          testId="error-state"
          variant="error"
          message={<p className="error-banner">{errorMessage}</p>}
        >
          <Button variant="secondary" onClick={handleRetry} data-testid="retry-btn">
            Retry
          </Button>
        </ListState>
      )}

      {listState === "empty" && (
        <ListState
          testId="empty-state"
          icon={<Inbox size={48} strokeWidth={1.5} />}
          message="You haven't created any tickets yet."
        >
          <Button
            variant="primary"
            onClick={() => navigate("/create-ticket")}
          >
            Create Ticket
          </Button>
        </ListState>
      )}

      {listState === "no-results" && (
        <ListState
          testId="no-results-state"
          icon={<SearchX size={48} strokeWidth={1.5} />}
          message="No tickets match your filters."
        >
          <Button variant="secondary" onClick={clearFilters}>
            Clear Filters
          </Button>
        </ListState>
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
