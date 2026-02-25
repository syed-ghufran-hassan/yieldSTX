;; Simple STX Yield Contract
;; Not production-ready. For educational purposes only.

(define-data-var contract-owner principal tx-sender)

(define-data-var total-deposits uint u0)

(define-map deposits
  { user: principal }
  { amount: uint, reward: uint })

;; Deposit STX into contract
(define-public (deposit (amount uint))
  (begin
    (asserts! (> amount u0) (err u100))

    ;; Transfer STX from sender to contract
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))

    (match (map-get? deposits { user: tx-sender })
      existing
        (map-set deposits 
          { user: tx-sender }
          { amount: (+ (get amount existing) amount),
            reward: (get reward existing) })
      (map-set deposits 
        { user: tx-sender }
        { amount: amount, reward: u0 })
    )

    (var-set total-deposits (+ (var-get total-deposits) amount))
    (ok true)
  )
)

;; Owner distributes rewards proportionally
(define-public (distribute-rewards (reward-amount uint))
  (begin
    (asserts! (is-eq tx-sender (var-get contract-owner)) (err u101))
    ;; In production, you'd loop or calculate per-user distribution
     
    (ok reward-amount)
  )
)

(define-public (withdraw)
  (match (map-get? deposits { user: tx-sender })
    deposit-data
      (let (
            ;; Calculate proportional reward based on total deposits
            (total-rewards (var-get total-deposits))
            (user-reward (get reward deposit-data))
            (principal (get amount deposit-data))
            (total (+ principal user-reward))
           )
        ;; Remove deposit record
        (map-delete deposits { user: tx-sender })
        ;; Update total deposits
        (var-set total-deposits (- (var-get total-deposits) principal))
        ;; Transfer total to user
        (try! (stx-transfer? total (as-contract tx-sender) tx-sender))
        (ok total)
      )
    (err u102)
  )
)
