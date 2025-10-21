(define-constant ERR_NOT_AUTHORIZED u100)
(define-constant ERR_PETITION_NOT_FOUND u101)
(define-constant ERR_PETITION_CLOSED u102)
(define-constant ERR_INVALID_INPUT u103)
(define-constant ERR_INVALID_TITLE u104)
(define-constant ERR_INVALID_DESCRIPTION u105)
(define-constant ERR_INVALID_TARGET u106)
(define-constant ERR_INVALID_DEADLINE u107)
(define-constant ERR_PETITION_ALREADY_EXISTS u108)
(define-constant ERR_INVALID_STATUS u109)
(define-constant ERR_UPDATE_NOT_ALLOWED u110)
(define-constant ERR_INVALID_UPDATE_PARAM u111)
(define-constant ERR_MAX_PETITIONS_EXCEEDED u112)
(define-constant ERR_INVALID_CATEGORY u113)
(define-constant ERR_INVALID_PRIORITY u114)
(define-constant ERR_INVALID_LOCATION u115)
(define-constant ERR_INVALID_TAGS u116)
(define-constant ERR_AUTHORITY_NOT_SET u117)
(define-constant ERR_INVALID_TIMESTAMP u118)
(define-constant ERR_INVALID_MIN_SIGNATURES u119)
(define-constant ERR_INVALID_MAX_EXTENSION u120)

(define-data-var petition-counter uint u0)
(define-data-var max-petitions uint u10000)
(define-data-var creation-fee uint u500)
(define-data-var authority-contract (optional principal) none)

(define-map Petitions
  { petition-id: uint }
  {
    creator: principal,
    title: (string-ascii 100),
    description: (string-utf8 500),
    target-signatures: uint,
    current-signatures: uint,
    deadline: uint,
    is-active: bool,
    category: (string-ascii 50),
    priority: uint,
    location: (string-utf8 100),
    tags: (list 10 (string-ascii 20)),
    timestamp: uint,
    status: (string-ascii 20),
    min-signatures: uint,
    max-extension: uint
  }
)

(define-map PetitionsByTitle
  (string-ascii 100)
  uint)

(define-map PetitionUpdates
  { petition-id: uint }
  {
    update-title: (string-ascii 100),
    update-description: (string-utf8 500),
    update-target: uint,
    update-timestamp: uint,
    updater: principal
  }
)

(define-read-only (get-petition (id uint))
  (map-get? Petitions { petition-id: id })
)

(define-read-only (get-petition-updates (id uint))
  (map-get? PetitionUpdates { petition-id: id })
)

(define-read-only (is-petition-registered (title (string-ascii 100)))
  (is-some (map-get? PetitionsByTitle title))
)

(define-private (validate-title (title (string-ascii 100)))
  (if (and (> (len title) u0) (<= (len title) u100))
      (ok true)
      (err ERR_INVALID_TITLE))
)

(define-private (validate-description (desc (string-utf8 500)))
  (if (and (> (len desc) u0) (<= (len desc) u500))
      (ok true)
      (err ERR_INVALID_DESCRIPTION))
)

(define-private (validate-target-signatures (target uint))
  (if (> target u0)
      (ok true)
      (err ERR_INVALID_TARGET))
)

(define-private (validate-deadline (deadline uint))
  (if (> deadline block-height)
      (ok true)
      (err ERR_INVALID_DEADLINE))
)

(define-private (validate-category (cat (string-ascii 50)))
  (if (or (is-eq cat "policy") (is-eq cat "environment") (is-eq cat "social"))
      (ok true)
      (err ERR_INVALID_CATEGORY))
)

(define-private (validate-priority (pri uint))
  (if (<= pri u10)
      (ok true)
      (err ERR_INVALID_PRIORITY))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (<= (len loc) u100)
      (ok true)
      (err ERR_INVALID_LOCATION))
)

(define-private (validate-tags (tags (list 10 (string-ascii 20))))
  (if (<= (len tags) u10)
      (ok true)
      (err ERR_INVALID_TAGS))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR_INVALID_TIMESTAMP))
)

(define-private (validate-min-signatures (min uint))
  (if (> min u0)
      (ok true)
      (err ERR_INVALID_MIN_SIGNATURES))
)

(define-private (validate-max-extension (max uint))
  (if (<= max u30)
      (ok true)
      (err ERR_INVALID_MAX_EXTENSION))
)

(define-private (validate-principal (p principal))
  (if (not (is-eq p 'SP000000000000000000002Q6VF78))
      (ok true)
      (err ERR_NOT_AUTHORIZED))
)

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (try! (validate-principal contract-principal))
    (asserts! (is-none (var-get authority-contract)) (err ERR_AUTHORITY_NOT_SET))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-max-petitions (new-max uint))
  (begin
    (asserts! (> new-max u0) (err ERR_MAX_PETITIONS_EXCEEDED))
    (asserts! (is-some (var-get authority-contract)) (err ERR_AUTHORITY_NOT_SET))
    (var-set max-petitions new-max)
    (ok true)
  )
)

(define-public (set-creation-fee (new-fee uint))
  (begin
    (asserts! (>= new-fee u0) (err ERR_INVALID_UPDATE_PARAM))
    (asserts! (is-some (var-get authority-contract)) (err ERR_AUTHORITY_NOT_SET))
    (var-set creation-fee new-fee)
    (ok true)
  )
)

(define-public (create-petition
  (title (string-ascii 100))
  (description (string-utf8 500))
  (target-signatures uint)
  (deadline uint)
  (category (string-ascii 50))
  (priority uint)
  (location (string-utf8 100))
  (tags (list 10 (string-ascii 20)))
  (min-signatures uint)
  (max-extension uint)
)
  (let (
        (next-id (var-get petition-counter))
        (current-max (var-get max-petitions))
        (authority (var-get authority-contract))
      )
    (asserts! (< next-id current-max) (err ERR_MAX_PETITIONS_EXCEEDED))
    (try! (validate-title title))
    (try! (validate-description description))
    (try! (validate-target-signatures target-signatures))
    (try! (validate-deadline deadline))
    (try! (validate-category category))
    (try! (validate-priority priority))
    (try! (validate-location location))
    (try! (validate-tags tags))
    (try! (validate-min-signatures min-signatures))
    (try! (validate-max-extension max-extension))
    (asserts! (is-none (map-get? PetitionsByTitle title)) (err ERR_PETITION_ALREADY_EXISTS))
    (let ((authority-recipient (unwrap! authority (err ERR_AUTHORITY_NOT_SET))))
      (try! (stx-transfer? (var-get creation-fee) tx-sender authority-recipient))
    )
    (map-insert Petitions { petition-id: next-id }
      {
        creator: tx-sender,
        title: title,
        description: description,
        target-signatures: target-signatures,
        current-signatures: u0,
        deadline: deadline,
        is-active: true,
        category: category,
        priority: priority,
        location: location,
        tags: tags,
        timestamp: block-height,
        status: "open",
        min-signatures: min-signatures,
        max-extension: max-extension
      }
    )
    (map-set PetitionsByTitle title next-id)
    (var-set petition-counter (+ next-id u1))
    (print { event: "petition-created", id: next-id })
    (ok next-id)
  )
)

(define-public (update-petition
  (petition-id uint)
  (update-title (string-ascii 100))
  (update-description (string-utf8 500))
  (update-target uint)
)
  (let ((petition (map-get? Petitions { petition-id: petition-id })))
    (match petition
      p
        (begin
          (asserts! (is-eq (get creator p) tx-sender) (err ERR_NOT_AUTHORIZED))
          (asserts! (get is-active p) (err ERR_PETITION_CLOSED))
          (try! (validate-title update-title))
          (try! (validate-description update-description))
          (try! (validate-target-signatures update-target))
          (let ((existing (map-get? PetitionsByTitle update-title)))
            (match existing
              existing-id
                (asserts! (is-eq existing-id petition-id) (err ERR_PETITION_ALREADY_EXISTS))
              (begin true)
            )
          )
          (let ((old-title (get title p)))
            (if (is-eq old-title update-title)
                (ok true)
                (begin
                  (map-delete PetitionsByTitle old-title)
                  (map-set PetitionsByTitle update-title petition-id)
                  (ok true)
                )
            )
          )
          (map-set Petitions { petition-id: petition-id }
            (merge p {
              title: update-title,
              description: update-description,
              target-signatures: update-target,
              timestamp: block-height
            })
          )
          (map-set PetitionUpdates { petition-id: petition-id }
            {
              update-title: update-title,
              update-description: update-description,
              update-target: update-target,
              update-timestamp: block-height,
              updater: tx-sender
            }
          )
          (print { event: "petition-updated", id: petition-id })
          (ok true)
        )
      (err ERR_PETITION_NOT_FOUND)
    )
  )
)

(define-public (close-petition (petition-id uint))
  (let ((petition (map-get? Petitions { petition-id: petition-id })))
    (match petition
      p
        (begin
          (asserts! (is-eq (get creator p) tx-sender) (err ERR_NOT_AUTHORIZED))
          (asserts! (get is-active p) (err ERR_PETITION_CLOSED))
          (map-set Petitions { petition-id: petition-id }
            (merge p { is-active: false, status: "closed" })
          )
          (print { event: "petition-closed", id: petition-id })
          (ok true)
        )
      (err ERR_PETITION_NOT_FOUND)
    )
  )
)

(define-public (increment-signatures (petition-id uint) (amount uint))
  (let ((petition (map-get? Petitions { petition-id: petition-id })))
    (match petition
      p
        (begin
          (asserts! (get is-active p) (err ERR_PETITION_CLOSED))
          (asserts! (<= (+ (get current-signatures p) amount) (get target-signatures p)) (err ERR_INVALID_INPUT))
          (map-set Petitions { petition-id: petition-id }
            (merge p { current-signatures: (+ (get current-signatures p) amount) })
          )
          (print { event: "signatures-incremented", id: petition-id, amount: amount })
          (ok true)
        )
      (err ERR_PETITION_NOT_FOUND)
    )
  )
)

(define-public (get-petition-count)
  (ok (var-get petition-counter))
)

(define-public (check-petition-existence (title (string-ascii 100)))
  (ok (is-petition-registered title))
)