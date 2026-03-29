package api

import (
	"fmt"
	"net/http"
	"net/url"
)

// Collection matches public.collections plus embedded row count.
type Collection struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	Slug             string `json:"slug"`
	Icon             string `json:"icon"`
	Color            string `json:"color"`
	IsLiveSource     bool   `json:"is_live_source"`
	SyncStatus       string `json:"sync_status"`
	LastSyncedAt     string `json:"last_synced_at"`
	SortOrder        int    `json:"sort_order"`
	Rows             []struct {
		Count int `json:"count"`
	} `json:"rows,omitempty"`
}

// RowCount returns the embedded PostgREST count, or 0.
func (c *Collection) RowCount() int {
	if c == nil || len(c.Rows) == 0 {
		return 0
	}
	return c.Rows[0].Count
}

// ListCollections fetches collections ordered by sort_order.
func (c *Client) ListCollections() ([]Collection, error) {
	q := url.Values{}
	q.Set("select", "*,rows(count)")
	q.Set("order", "sort_order.asc")
	var out []Collection
	err := c.doJSON(http.MethodGet, "/rest/v1/collections", q, nil, &out)
	return out, err
}

// CreateCollection inserts a new collection for the authenticated user.
func (c *Client) CreateCollection(userID, name, slug, icon, color string) (*Collection, error) {
	var maxSort []struct {
		SortOrder int `json:"sort_order"`
	}
	q := url.Values{}
	q.Set("select", "sort_order")
	q.Set("order", "sort_order.desc")
	q.Set("limit", "1")
	if err := c.doJSON(http.MethodGet, "/rest/v1/collections", q, nil, &maxSort); err != nil {
		return nil, err
	}
	next := 0
	if len(maxSort) > 0 {
		next = maxSort[0].SortOrder + 1
	}
	body := map[string]any{
		"user_id":          userID,
		"name":             name,
		"slug":             slug,
		"icon":             icon,
		"color":            color,
		"is_live_source":   false,
		"sort_order":       next,
		"sync_status":      "idle",
		"description":      nil,
		"live_source_type": nil,
	}
	var created []Collection
	if err := c.doJSON(http.MethodPost, "/rest/v1/collections", url.Values{"select": []string{"*"}}, body, &created); err != nil {
		return nil, err
	}
	if len(created) == 0 {
		return nil, fmt.Errorf("create collection: empty response")
	}
	return &created[0], nil
}

// UpdateCollection PATCHes columns for the given id.
func (c *Client) UpdateCollection(id string, updates map[string]any) error {
	q := url.Values{}
	q.Set("id", "eq."+id)
	return c.doJSON(http.MethodPatch, "/rest/v1/collections", q, updates, nil)
}

// DeleteCollection removes a collection by id.
func (c *Client) DeleteCollection(id string) error {
	q := url.Values{}
	q.Set("id", "eq."+id)
	return c.doJSON(http.MethodDelete, "/rest/v1/collections", q, nil, nil)
}
