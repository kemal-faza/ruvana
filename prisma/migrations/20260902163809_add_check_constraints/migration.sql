-- Add CHECK constraints for reservations operating hours (07:00-20:00, 30-min slots)
ALTER TABLE `reservations`
  ADD CONSTRAINT `chk_jam_operasional` CHECK (
    `startTime` >= '07:00:00' AND `endTime` <= '20:00:00' AND `startTime` < `endTime`
  ),
  ADD CONSTRAINT `chk_slot_30menit` CHECK (
    MINUTE(`startTime`) IN (0,30) AND MINUTE(`endTime`) IN (0,30)
  );
