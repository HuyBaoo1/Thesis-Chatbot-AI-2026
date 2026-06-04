import { useState } from "react";
import { useTranslation } from "react-i18next";
import { crawlService } from "../../lib/crawl.service";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Spinner } from "../../components/ui/spinner";

export function CreateCrawlModal({ open, onOpenChange, onSuccess }) {
  const [url, setUrl] = useState("");
  const [limit, setLimit] = useState(100);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await crawlService.createSession({
        target_url: url,
        limit: limit,
        strategy: "default",
      });
      setUrl("");
      setLimit(100);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create crawl session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start New Crawl</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Target URL</label>
            <Input
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Page Limit</label>
            <Input
              type="number"
              min={1}
              max={10000}
              value={limit}
              onChange={(e) => setLimit(parseInt(e.target.value) || 100)}
              required
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Spinner size="sm" className="mr-2" />}
              Start Crawl
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
