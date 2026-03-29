package api

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// Row matches public.rows.
type Row struct {
	ID           string         `json:"id"`
	CollectionID string         `json:"collection_id"`
	Data         map[string]any `json:"data"`
	CreatedAt    string         `json:"created_at"`
	UpdatedAt    string         `json:"updated_at"`
	SortOrder    int            `json:"sort_order"`
	ExternalID   *string        `json:"external_id"`
}

// ListRows returns a page of rows for a collection.
func (c *Client) ListRows(collectionID string, limit, offset int) ([]Row, error) {
	q := url.Values{}
	q.Set("select", "*")
	q.Set("collection_id", "eq."+collectionID)
	q.Set("order", "sort_order.asc")
	q.Set("limit", fmt.Sprintf("%d", limit))
	q.Set("offset", fmt.Sprintf("%d", offset))
	var out []Row
	err := c.doJSON(http.MethodGet, "/rest/v1/rows", q, nil, &out)
	return out, err
}

// CreateRow inserts a row with next sort_order.
func (c *Client) CreateRow(userID, collectionID string, data map[string]any) (*Row, error) {
	var maxSort []struct {
		SortOrder int `json:"sort_order"`
	}
	q := url.Values{}
	q.Set("select", "sort_order")
	q.Set("collection_id", "eq."+collectionID)
	q.Set("order", "sort_order.desc")
	q.Set("limit", "1")
	if err := c.doJSON(http.MethodGet, "/rest/v1/rows", q, nil, &maxSort); err != nil {
		return nil, err
	}
	next := 0
	if len(maxSort) > 0 {
		next = maxSort[0].SortOrder + 1
	}
	if data == nil {
		data = map[string]any{}
	}
	body := map[string]any{
		"user_id":        userID,
		"collection_id":  collectionID,
		"data":           data,
		"sort_order":     next,
	}
	var created []Row
	if err := c.doJSON(http.MethodPost, "/rest/v1/rows", url.Values{"select": []string{"*"}}, body, &created); err != nil {
		return nil, err
	}
	if len(created) == 0 {
		return nil, fmt.Errorf("create row: empty response")
	}
	return &created[0], nil
}

// UpdateRow merges data into the existing row JSON.
func (c *Client) UpdateRow(id string, data map[string]any) error {
	var current []Row
	q := url.Values{}
	q.Set("select", "data")
	q.Set("id", "eq."+id)
	if err := c.doJSON(http.MethodGet, "/rest/v1/rows", q, nil, &current); err != nil {
		return err
	}
	if len(current) == 0 {
		return fmt.Errorf("row not found")
	}
	merged := map[string]any{}
	for k, v := range current[0].Data {
		merged[k] = v
	}
	for k, v := range data {
		merged[k] = v
	}
	patchQ := url.Values{}
	patchQ.Set("id", "eq."+id)
	return c.doJSON(http.MethodPatch, "/rest/v1/rows", patchQ, map[string]any{"data": merged}, nil)
}

// DeleteRow removes a row by id.
func (c *Client) DeleteRow(id string) error {
	q := url.Values{}
	q.Set("id", "eq."+id)
	return c.doJSON(http.MethodDelete, "/rest/v1/rows", q, nil, nil)
}

// SearchRows filters rows client-side by stringifying data values.
func SearchRows(rows []Row, query string) []Row {
	if query == "" {
		return rows
	}
	q := stringsToLowerFold(query)
	out := make([]Row, 0, len(rows))
	for _, r := range rows {
		if rowMatches(r, q) {
			out = append(out, r)
		}
	}
	return out
}

func stringsToLowerFold(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}

func rowMatches(r Row, q string) bool {
	for _, v := range r.Data {
		if v == nil {
			continue
		}
		switch t := v.(type) {
		case string:
			if strings.Contains(strings.ToLower(t), q) {
				return true
			}
		case float64:
			if strings.Contains(strings.ToLower(fmt.Sprint(t)), q) {
				return true
			}
		case bool:
			if strings.Contains(strings.ToLower(fmt.Sprint(t)), q) {
				return true
			}
		default:
			if strings.Contains(strings.ToLower(fmt.Sprint(t)), q) {
				return true
			}
		}
	}
	return false
}
