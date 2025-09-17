import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function PromotionModal({ promotion, isOpen, onClose }) {
  if (!promotion) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-white p-6 rounded-lg shadow-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-800">{promotion.title}</DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            {promotion.description}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          <img src={promotion.image} alt={promotion.title} className="w-full h-48 object-cover rounded-md" />
        </div>
        <div className="mt-4 flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Válido de {new Date(promotion.valid_from).toLocaleDateString()}</p>
            <p className="text-sm text-gray-500">Até {new Date(promotion.valid_to).toLocaleDateString()}</p>
          </div>
          {promotion.badge_text && (
            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
              {promotion.badge_text}
            </span>
          )}
        </div>
        <div className="mt-4 text-center">
          <Badge variant="destructive" className="text-lg p-2">
            {promotion.discount}% de desconto
          </Badge>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={onClose} variant="outline">Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}