// CheckoutSelector — Dual-mode fulfillment toggle.
// HOME_DELIVERY: address + slot selection
// STORE_PICKUP: zero delivery fee, no address needed (Click & Collect)

import { useState, useEffect } from 'react';
import { ordersApi } from '../../api/orders.api.js';
import { formatPrice } from '../../utils/currency.js';

const FREE_THRESHOLD = 500; // must match backend env
const DELIVERY_FEE = 40;

export default function CheckoutSelector({ subtotal, value, onChange }) {
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  const isDelivery = value === 'HOME_DELIVERY';
  const deliveryFee = isDelivery && subtotal < FREE_THRESHOLD ? DELIVERY_FEE : 0;

  // Fetch slots when delivery mode is selected or date changes
  useEffect(() => {
    if (!isDelivery) return;
    setLoadingSlots(true);
    ordersApi
      .getSlots(selectedDate)
      .then((res) => setSlots(res.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [isDelivery, selectedDate]);

  // Notify parent when slot selection changes
  useEffect(() => {
    onChange({ fulfillmentType: value, deliverySlotId: selectedSlot, deliveryFee });
  }, [value, selectedSlot, deliveryFee]); // eslint-disable-line

  return (
    <div className="space-y-3">
      {/* Mode Toggle */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl">
        <ModeButton
          active={isDelivery}
          onClick={() => onChange({ fulfillmentType: 'HOME_DELIVERY', deliverySlotId: null, deliveryFee: subtotal < FREE_THRESHOLD ? DELIVERY_FEE : 0 })}
          icon="🛵"
          label="Home Delivery"
          sub={subtotal >= FREE_THRESHOLD ? 'FREE delivery' : `+${formatPrice(DELIVERY_FEE)}`}
        />
        <ModeButton
          active={!isDelivery}
          onClick={() => onChange({ fulfillmentType: 'STORE_PICKUP', deliverySlotId: null, deliveryFee: 0 })}
          icon="🏪"
          label="Store Pickup"
          sub="FREE · Zero wait"
        />
      </div>

      {/* Delivery: date + slot picker */}
      {isDelivery && (
        <div className="space-y-2 pt-1">
          {/* Date selector — next 3 days */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {getNextDays(3).map((day) => (
              <button
                key={day.str}
                onClick={() => { setSelectedDate(day.str); setSelectedSlot(null); }}
                className={`
                  flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium border transition-colors
                  ${selectedDate === day.str
                    ? 'bg-brand-600 text-white border-brand-600'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
                  }
                `}
              >
                <div className="font-semibold">{day.label}</div>
                <div className="text-xs opacity-75">{day.date}</div>
              </button>
            ))}
          </div>

          {/* Slot grid */}
          {loadingSlots ? (
            <div className="grid grid-cols-3 gap-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : slots.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-3">
              No slots available for this date
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {slots.map((slot) => {
                const full = slot.booked >= slot.capacity;
                const isSelected = selectedSlot === slot.id;
                return (
                  <button
                    key={slot.id}
                    disabled={full}
                    onClick={() => setSelectedSlot(isSelected ? null : slot.id)}
                    className={`
                      py-2 px-1 rounded-lg text-xs border transition-colors text-center
                      ${full
                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                        : isSelected
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-400'
                      }
                    `}
                  >
                    <div className="font-medium">{slot.startTime}–{slot.endTime}</div>
                    {full ? (
                      <div className="text-red-400 text-[10px]">Full</div>
                    ) : (
                      <div className="text-green-600 text-[10px]">
                        {slot.capacity - slot.booked} left
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Store pickup info */}
      {!isDelivery && (
        <div className="flex items-start gap-2 bg-green-50 rounded-xl px-3 py-3 text-sm text-green-800">
          <span className="text-lg">📍</span>
          <div>
            <p className="font-semibold">SuperMart — Ring Road, Surat</p>
            <p className="text-xs text-green-600 mt-0.5">Open 8AM–10PM · Ready in 30 min after order</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ModeButton({ active, onClick, icon, label, sub }) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center py-3 px-2 rounded-xl border-2 transition-all font-medium text-sm
        ${active
          ? 'border-brand-600 bg-white text-brand-700 shadow-sm'
          : 'border-transparent bg-transparent text-gray-500'
        }
      `}
    >
      <span className="text-xl mb-1">{icon}</span>
      <span>{label}</span>
      <span className={`text-xs mt-0.5 ${active ? 'text-brand-500' : 'text-gray-400'}`}>{sub}</span>
    </button>
  );
}

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getNextDays(n) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return {
      str: d.toISOString().slice(0, 10),
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    };
  });
}
