// Package types defines shared domain types used across new code.
// Types already present in internal/api (Collection, Field, Row) are not
// duplicated here — import that package when you need them.
package types

// User is the authenticated user embedded in a Supabase session.
type User struct {
	ID    string `json:"id"`
	Email string `json:"email"`
	Name  string `json:"user_metadata.full_name"`
}

// SessionUser is retained as a compatibility alias for existing callers.
type SessionUser = User

// Session holds the tokens and metadata returned by a Supabase auth grant.
// ExpiresAt is stored as a unix timestamp in seconds.
type Session struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
	TokenType    string `json:"token_type"`
	User         User   `json:"user"`
}

// Workspace represents a top-level user workspace (multi-workspace support).
type Workspace struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	OwnerID   string `json:"owner_id"`
	CreatedAt string `json:"created_at"`
}

// Article is a high-level content document that belongs to a Collection.
// Unlike the raw Row type in internal/api, Article carries resolved field
// values and display metadata.
type Article struct {
	ID           string         `json:"id"`
	CollectionID string         `json:"collection_id"`
	Title        string         `json:"title"`
	Data         map[string]any `json:"data"`
	SortOrder    int            `json:"sort_order"`
	CreatedAt    string         `json:"created_at"`
	UpdatedAt    string         `json:"updated_at"`
}

// Property describes a schema property on a Collection, analogous to a column
// definition.  Unlike the api.Field type (which maps to the raw DB row),
// Property carries resolved display metadata used by view renderers.
type Property struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Slug       string `json:"slug"`
	Type       string `json:"type"`
	IsPrimary  bool   `json:"is_primary"`
	IsRequired bool   `json:"is_required"`
	SortOrder  int    `json:"sort_order"`
	Hidden     bool   `json:"hidden"`
}

// ViewType enumerates the supported layout modes for a View.
type ViewType string

const (
	ViewTypeTable    ViewType = "table"
	ViewTypeGallery  ViewType = "gallery"
	ViewTypeKanban   ViewType = "kanban"
	ViewTypeCalendar ViewType = "calendar"
	ViewTypeList     ViewType = "list"
)

// View is a saved configuration for displaying a Collection's rows.
type View struct {
	ID           string   `json:"id"`
	CollectionID string   `json:"collection_id"`
	Name         string   `json:"name"`
	Type         ViewType `json:"type"`
	SortOrder    int      `json:"sort_order"`
	Filters      []Filter `json:"filters,omitempty"`
	Sorts        []Sort   `json:"sorts,omitempty"`
}

// Filter represents a single PostgREST-style filter condition on a View.
type Filter struct {
	PropertySlug string `json:"property_slug"`
	Operator     string `json:"operator"` // eq, neq, lt, gt, like, …
	Value        any    `json:"value"`
}

// Sort represents a single sort directive on a View.
type Sort struct {
	PropertySlug string `json:"property_slug"`
	Descending   bool   `json:"descending"`
}
